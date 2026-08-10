// useOCR - Trigger OCR Edge Functions for document processing

import { useEffect, useCallback, useState } from 'react'
import { supabase, logPilotEvent } from '@lib/supabase'
import { useSync } from '@hooks/useSync'
import { useDexie } from '@hooks/useDexie'
import { useAuth } from '@hooks/useAuth'
import type { DocumentDexie } from '@lib/dexie'

interface OCRResult {
  lineItems: Array<{
    room?: string
    position?: string
    description?: string
    range?: string
    colour?: string
    widthMm?: number
    quantity: number
    unitPrice?: number
    lineTotal?: number
  }>
  additionalNotes?: string | null
  confidence: number
  modelVersion: string
  promptVersion: string
}

interface CommissionOCRResult {
  lineItems: Array<{
    lineDate?: string
    invoiceNumber?: string
    jobCode: string
    customerNumber?: string
    customerName?: string
    lineType?: 'sale' | 'service' | 'dor_penalty' | 'refit' | 'adjustment'
    lineTypeRaw?: string
    commissionRatePercent?: number
    orderValueIncVat?: number
    orderValueExcVat?: number
    amountIncVat?: number
    amountExcVat?: number
  }>
  additionalNotes?: string | null
  confidence: number
  modelVersion: string
  promptVersion: string
}

interface FitOCRResult {
  lineItems: Array<{
    jobCode: string
    lineNumber: number
    room?: string
    position?: string
    fitStatus: 'fitted' | 'replacement'
    refitDate?: string
  }>
  additionalNotes?: string | null
  confidence: number
  modelVersion: string
  promptVersion: string
}

interface DeliveryOCRResult {
  jobCode: string
  customerNumber: string
  deliveryDate?: string
  items: Array<{
    lineNumber: number
    description: string
    quantity: number
    status: 'delivered' | 'pending' | 'damaged' | 'returned'
  }>
  fanOutTargets: string[]
  additionalNotes?: string | null
  confidence: number
  modelVersion: string
  promptVersion: string
}

interface ExpenseOCRResult {
  merchant?: string
  date?: string
  amount?: number
  vatAmount?: number
  category: string
  items: Array<{
    description: string
    amount: number
    vatAmount?: number
  }>
  additionalNotes?: string | null
  confidence: number
  modelVersion: string
  promptVersion: string
}

interface ClassifyResult {
  documentType: string
  confidence: number
  reasoning: string
  additionalNotes?: string | null
}

const EDGE_FUNCTION_MAP: Record<string, string> = {
  quote_or_receipt: 'ocr-quote',
  commission_statement: 'ocr-commission',
  fit_completion_receipt: 'ocr-fit-completion',
  delivery_drop_note: 'ocr-delivery-drop-note',
  expense_receipt: 'ocr-expense-receipt',
}

// OCR retry configuration
const MAX_OCR_RETRIES = 3
const OCR_RETRY_BACKOFF_MS = 2000 // Base delay: 2s, then exponential: 2s, 4s, 8s

// Check if error is a 500 server error (circuit breaker)
function isServerError(err: unknown): boolean {
  if (err instanceof Error) {
    // Check if error message contains HTTP 500
    return err.message.includes('500') || err.message.includes('HTTP 500')
  }
  return false
}

export function useOCR() {
  const { db, isReady } = useDexie()
  const { advisor } = useAuth()
  const { status: syncStatus } = useSync()
  const { showToast } = useToast()
  const [processing, setProcessing] = useState(false)
  const [lastProcessed, setLastProcessed] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const classifyDocument = useCallback(async (storagePath: string): Promise<ClassifyResult | null> => {
    try {
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-document`
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ image_path: storagePath }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Classification failed: ${errorData.error || 'Unknown error'}`)
      }

      return await response.json()
    } catch (err) {
      console.error('Document classification failed:', err)
      return null
    }
  }, [])

  const callOCRFunction = useCallback(async (
    edgeFunctionName: string,
    documentId: number,
    storagePath: string
  ): Promise<any> => {
    const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${edgeFunctionName}`
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        document_id: String(documentId),
        image_path: storagePath,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OCR failed: ${errorData.error || 'Unknown error'}`)
    }

    return await response.json()
  }, [])

  const processPendingDocuments = useCallback(async () => {
    if (!isReady || !advisor || processing) return
    
    setProcessing(true)
    setError(null)
    
    try {
      // Get documents that need OCR (status = 'uploaded' or 'processing')
      // Exclude documents that have permanently failed OCR (ocrRetryCount >= MAX_OCR_RETRIES)
      const pendingDocs = await db.documents
        .where('advisorId')
        .equals(advisor.id!)
        .and(d => ['uploaded', 'processing'].includes(d.status) && (d.ocrRetryCount ?? 0) < MAX_OCR_RETRIES)
        .toArray()

      if (pendingDocs.length === 0) {
        setProcessing(false)
        return
      }

      console.log(`Processing ${pendingDocs.length} documents for OCR`)

      for (const doc of pendingDocs) {
        const currentRetry = doc.ocrRetryCount ?? 0
        try {
          // Upload image to Storage first if needed
          const imagePath = doc.imagePath
          let storagePath = imagePath
          
          if (imagePath.startsWith('blob:') || imagePath.startsWith('data:')) {
            const response = await fetch(imagePath)
            const blob = await response.blob()
            
            const fileName = `documents/${advisor.id}/${doc.id}.jpg`
            const { error: uploadError } = await supabase.storage
              .from('documents')
              .upload(fileName, blob, {
                contentType: 'image/jpeg',
                upsert: true
              })
            
            if (uploadError) {
              throw new Error(`Failed to upload image: ${uploadError.message}`)
            }
            
            storagePath = fileName
            await db.documents.update(doc.id!, { imagePath: storagePath })
          }

          // Classify document type if not already set (truly unclassified)
          let documentType = doc.type
          const needsClassification = !doc.type // only classify if type is genuinely unknown
          
          if (needsClassification) {
            await db.documents.update(doc.id!, { status: 'classifying', updatedAt: new Date() })
            const classification = await classifyDocument(storagePath)
            
            if (classification && classification.confidence > 0.5) {
              documentType = classification.documentType
              await db.documents.update(doc.id!, { 
                type: documentType as any,
                additionalNotes: classification.additionalNotes,
                status: 'uploaded',
                updatedAt: new Date(),
              })
              console.log(`Document ${doc.id} classified as ${documentType} (${classification.reasoning})`)
            }
          }

          // Determine which OCR function to call based on document type
          const edgeFunctionName = EDGE_FUNCTION_MAP[documentType]
          
          if (!edgeFunctionName) {
            await db.documents.update(doc.id!, { 
              ocrError: 'No OCR function configured for this document type',
              ocrRetryCount: MAX_OCR_RETRIES, // prevent retry
              updatedAt: new Date(),
            })
            continue
          }

          // Update status to processing
          await db.documents.update(doc.id!, { status: 'processing', updatedAt: new Date() })

          // Call OCR Edge Function
          const result = await callOCRFunction(edgeFunctionName, doc.id!, storagePath)

          // Process based on document type
          if (documentType === 'quote_or_receipt') {
            const quoteResult = result as OCRResult
            
            await db.documents.update(doc.id!, {
              parsedJson: { lineItems: quoteResult.lineItems },
              additionalNotes: quoteResult.additionalNotes,
              status: 'parsed',
              modelVersion: quoteResult.modelVersion,
              promptVersion: quoteResult.promptVersion,
              confidence: quoteResult.confidence,
              extractedAt: new Date(),
              updatedAt: new Date(),
            })

            for (const lineItem of quoteResult.lineItems) {
              await db.quoteLineItems.add({
                documentId: doc.id!,
                room: lineItem.room,
                position: lineItem.position,
                description: lineItem.description,
                range: lineItem.range,
                colour: lineItem.colour,
                widthMm: lineItem.widthMm,
                quantity: lineItem.quantity,
                unitPrice: lineItem.unitPrice,
                lineTotal: lineItem.lineTotal,
                sourceEnv: (import.meta.env.VITE_SOURCE_ENV as 'demo' | 'qa' | 'live') || 'live',
                modelVersion: quoteResult.modelVersion,
                promptVersion: quoteResult.promptVersion,
                confidence: quoteResult.confidence,
                extractedAt: new Date(),
                createdAt: new Date(),
              })
            }
          } else if (documentType === 'commission_statement') {
            const commissionResult = result as CommissionOCRResult
            
            await db.documents.update(doc.id!, {
              parsedJson: { lineItems: commissionResult.lineItems },
              additionalNotes: commissionResult.additionalNotes,
              status: 'parsed',
              modelVersion: commissionResult.modelVersion,
              promptVersion: commissionResult.promptVersion,
              confidence: commissionResult.confidence,
              extractedAt: new Date(),
              updatedAt: new Date(),
            })

            for (const lineItem of commissionResult.lineItems) {
              await db.commissionLineItems.add({
                commissionStatementDocumentId: doc.id!,
                lineDate: lineItem.lineDate ? new Date(lineItem.lineDate) : undefined,
                invoiceNumber: lineItem.invoiceNumber,
                jobCode: lineItem.jobCode,
                customerNumber: lineItem.customerNumber,
                customerName: lineItem.customerName,
                lineType: lineItem.lineType,
                lineTypeRaw: lineItem.lineTypeRaw,
                commissionRatePercent: lineItem.commissionRatePercent,
                orderValueIncVat: lineItem.orderValueIncVat,
                orderValueExcVat: lineItem.orderValueExcVat,
                amountIncVat: lineItem.amountIncVat,
                amountExcVat: lineItem.amountExcVat,
                sourceEnv: (import.meta.env.VITE_SOURCE_ENV as 'demo' | 'qa' | 'live') || 'live',
                modelVersion: commissionResult.modelVersion,
                promptVersion: commissionResult.promptVersion,
                confidence: commissionResult.confidence,
                extractedAt: new Date(),
                createdAt: new Date(),
              })
            }
          } else if (documentType === 'fit_completion_receipt') {
            const fitResult = result as FitOCRResult
            
            await db.documents.update(doc.id!, {
              parsedJson: { lineItems: fitResult.lineItems },
              additionalNotes: fitResult.additionalNotes,
              status: 'parsed',
              modelVersion: fitResult.modelVersion,
              promptVersion: fitResult.promptVersion,
              confidence: fitResult.confidence,
              extractedAt: new Date(),
              updatedAt: new Date(),
            })

            for (const lineItem of fitResult.lineItems) {
              await db.fitLineItems.add({
                documentId: doc.id!,
                jobCode: lineItem.jobCode,
                lineNumber: lineItem.lineNumber,
                room: lineItem.room,
                position: lineItem.position,
                fitStatus: lineItem.fitStatus,
                refitDate: lineItem.refitDate ? new Date(lineItem.refitDate) : undefined,
                sourceEnv: (import.meta.env.VITE_SOURCE_ENV as 'demo' | 'qa' | 'live') || 'live',
                modelVersion: fitResult.modelVersion,
                promptVersion: fitResult.promptVersion,
                confidence: fitResult.confidence,
                extractedAt: new Date(),
                createdAt: new Date(),
              })
            }
          } else if (documentType === 'delivery_drop_note') {
            const deliveryResult = result as DeliveryOCRResult
            
            await db.documents.update(doc.id!, {
              parsedJson: { 
                jobCode: deliveryResult.jobCode,
                customerNumber: deliveryResult.customerNumber,
                deliveryDate: deliveryResult.deliveryDate,
                items: deliveryResult.items,
                fanOutTargets: deliveryResult.fanOutTargets
              },
              additionalNotes: deliveryResult.additionalNotes,
              status: 'parsed',
              modelVersion: deliveryResult.modelVersion,
              promptVersion: deliveryResult.promptVersion,
              confidence: deliveryResult.confidence,
              extractedAt: new Date(),
              updatedAt: new Date(),
            })

            // Persist structured line items for delivery drop note (fan-out matching)
            for (const lineItem of deliveryResult.items) {
              await db.deliveryDropNoteLineItems.add({
                deliveryDropNoteId: doc.id!,
                lineNumber: lineItem.lineNumber,
                description: lineItem.description,
                quantity: lineItem.quantity,
                status: lineItem.status,
                sourceEnv: (import.meta.env.VITE_SOURCE_ENV as 'demo' | 'qa' | 'live') || 'live',
                modelVersion: deliveryResult.modelVersion,
                promptVersion: deliveryResult.promptVersion,
                confidence: deliveryResult.confidence,
                extractedAt: new Date(),
                createdAt: new Date(),
              })
            }
          } else if (documentType === 'expense_receipt') {
            const expenseResult = result as ExpenseOCRResult
            
            await db.documents.update(doc.id!, {
              parsedJson: expenseResult,
              additionalNotes: expenseResult.additionalNotes,
              status: 'parsed',
              modelVersion: expenseResult.modelVersion,
              promptVersion: expenseResult.promptVersion,
              confidence: expenseResult.confidence,
              extractedAt: new Date(),
              updatedAt: new Date(),
            })

            // Persist structured line items for expense receipt
            for (const lineItem of expenseResult.items) {
              await db.expenseLineItems.add({
                expenseId: doc.id!,
                description: lineItem.description,
                amount: lineItem.amount,
                vatAmount: lineItem.vatAmount,
                sourceEnv: (import.meta.env.VITE_SOURCE_ENV as 'demo' | 'qa' | 'live') || 'live',
                modelVersion: expenseResult.modelVersion,
                promptVersion: expenseResult.promptVersion,
                confidence: expenseResult.confidence,
                extractedAt: new Date(),
                createdAt: new Date(),
              })
            }
          }

          console.log(`OCR processed document ${doc.id} (${documentType})`)
            // Log pilot event: OCR success
            logPilotEvent('ocr_completed', {
              document_id: doc.id,
              document_type: documentType,
              duration_ms: Date.now() - doc.updatedAt.getTime(),
              confidence: 'confidence' in result ? (result as any).confidence : undefined,
              page_count: Array.isArray((result as any).lineItems) ? (result as any).lineItems.length : undefined,
            }).catch(() => {}) // Fire and forget
          } catch (err) {
            console.error(`Failed to process document ${doc.id} (attempt ${currentRetry + 1}/${MAX_OCR_RETRIES}):`, err)
            const nextRetry = currentRetry + 1
            
            // Circuit breaker: stop immediately on 500 server errors
            if (isServerError(err)) {
              console.error(`OCR circuit breaker triggered for document ${doc.id}: server error (500)`)
              await db.documents.update(doc.id!, {
                ocrError: err instanceof Error ? err.message : 'Server error (500)',
                ocrRetryCount: MAX_OCR_RETRIES,
                status: 'uploaded', // back to uploaded, no more retries
                updatedAt: new Date(),
              })
              showToast(`OCR server error for document ${doc.id}`, 'error')
              console.error(`OCR circuit breaker: document ${doc.id} set to uploaded due to server error`)
              
              // Log pilot event: OCR failed (circuit breaker)
              logPilotEvent('ocr_failed', {
                document_id: doc.id,
                document_type: documentType,
                error_message: err instanceof Error ? err.message : 'Server error (500)',
                retry_count: currentRetry + 1,
                circuit_breaker: true,
              }).catch(() => {}) // Fire and forget
            } else if (nextRetry >= MAX_OCR_RETRIES) {
              // Max retries exceeded - mark as uploaded (not error) and stop retrying
              await db.documents.update(doc.id!, {
                ocrError: err instanceof Error ? err.message : 'Unknown OCR error',
                ocrRetryCount: MAX_OCR_RETRIES,
                status: 'uploaded', // not 'error' or 'ocr_failed' - back to uploaded for manual retry
                updatedAt: new Date(),
              })
              showToast(`OCR failed for document ${doc.id} after ${MAX_OCR_RETRIES} attempts`, 'error')
              console.error(`OCR failed permanently for document ${doc.id} after ${MAX_OCR_RETRIES} attempts`)
              
              // Log pilot event: OCR failed
              logPilotEvent('ocr_failed', {
                document_id: doc.id,
                document_type: documentType,
                error_message: err instanceof Error ? err.message : 'Unknown OCR error',
                retry_count: MAX_OCR_RETRIES,
              }).catch(() => {}) // Fire and forget
            } else {
              // Schedule retry with exponential backoff (2s, 4s, 8s)
              await db.documents.update(doc.id!, {
                ocrError: err instanceof Error ? err.message : 'Unknown OCR error',
                ocrRetryCount: nextRetry,
                status: 'uploaded', // back to uploaded for retry
                updatedAt: new Date(),
              })
              showToast(`OCR failed, retrying (${nextRetry}/${MAX_OCR_RETRIES})`, 'warning')
              const delay = OCR_RETRY_BACKOFF_MS * Math.pow(2, nextRetry - 1) // 2s, 4s, 8s
              setTimeout(() => {
                if (!processing) {
                  processPendingDocuments()
                }
              }, delay)
            }
          }
      }

      setLastProcessed(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR processing failed')
      showToast(err instanceof Error ? err.message : 'OCR processing failed', 'error')
    } finally {
      setProcessing(false)
    }
  }, [isReady, db, classifyDocument, callOCRFunction])

  // Auto-process when sync is complete
  useEffect(() => {
    if (syncStatus === 'synced' && !processing) {
      processPendingDocuments()
    }
  }, [syncStatus, processing])

  useEffect(() => {
    if (isReady && !processing) {
      processPendingDocuments()
    }
  }, [isReady])

  return {
    processing,
    lastProcessed,
    error,
    processPendingDocuments,
  }
}