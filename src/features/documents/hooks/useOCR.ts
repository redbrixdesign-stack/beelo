// useOCR - Trigger OCR Edge Functions for document processing

import { useEffect, useCallback, useState } from 'react'
import { supabase } from '@lib/supabase'
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
    commissionRatePercent?: number
    orderValueIncVat?: number
    orderValueExcVat?: number
    amountIncVat?: number
    amountExcVat?: number
  }>
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
  confidence: number
  modelVersion: string
  promptVersion: string
}

export function useOCR() {
  const { db, isReady } = useDexie()
  const { advisor } = useAuth()
  const { status: syncStatus } = useSync()
  const [processing, setProcessing] = useState(false)
  const [lastProcessed, setLastProcessed] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const processPendingDocuments = useCallback(async () => {
    if (!isReady || !advisor || processing) return
    
    setProcessing(true)
    setError(null)
    
    try {
      // Get documents that need OCR (status = 'uploaded' or 'processing')
      const pendingDocs = await db.documents
        .where('advisorId')
        .equals(advisor.id!)
        .and(d => ['uploaded', 'processing'].includes(d.status))
        .toArray()

      if (pendingDocs.length === 0) {
        setProcessing(false)
        return
      }

      console.log(`Processing ${pendingDocs.length} documents for OCR`)

      for (const doc of pendingDocs) {
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
                upsert: false
              })
            
            if (uploadError) {
              throw new Error(`Failed to upload image: ${uploadError.message}`)
            }
            
            storagePath = fileName
            await db.documents.update(doc.id!, { imagePath: storagePath })
          }

          // Determine which OCR function to call based on document type
          const edgeFunctionName: string = (() => {
            switch (doc.type) {
              case 'quote_or_receipt': return 'ocr-quote'
              case 'commission_statement': return 'ocr-commission'
              case 'fit_completion_receipt': return 'ocr-fit-completion'
              default: return ''
            }
          })()

          if (!edgeFunctionName) {
            await db.documents.update(doc.id!, { status: 'error', updatedAt: new Date() })
            continue
          }

          // Update status to processing
          await db.documents.update(doc.id!, { status: 'processing', updatedAt: new Date() })

          // Call OCR Edge Function
          const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${edgeFunctionName}`
          const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              document_id: String(doc.id),
              image_path: storagePath,
              document_type: doc.type,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(`OCR failed: ${errorData.error || 'Unknown error'}`)
          }

          const result = await response.json()

          // Process based on document type
          if (doc.type === 'quote_or_receipt') {
            const quoteResult = result as OCRResult
            
            // Update document with parsed JSON
            await db.documents.update(doc.id!, {
              parsedJson: { lineItems: quoteResult.lineItems },
              status: 'parsed',
              modelVersion: quoteResult.modelVersion,
              promptVersion: quoteResult.promptVersion,
              confidence: quoteResult.confidence,
              extractedAt: new Date(),
              updatedAt: new Date(),
            })

            // Create QuoteLineItem records
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
          } else if (doc.type === 'commission_statement') {
            const commissionResult = result as CommissionOCRResult
            
            await db.documents.update(doc.id!, {
              parsedJson: { lineItems: commissionResult.lineItems },
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
          } else if (doc.type === 'fit_completion_receipt') {
            const fitResult = result as FitOCRResult
            
            await db.documents.update(doc.id!, {
              parsedJson: { lineItems: fitResult.lineItems },
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
          }

          console.log(`OCR processed document ${doc.id} (${doc.type})`)
        } catch (err) {
          console.error(`Failed to process document ${doc.id}:`, err)
          await db.documents.update(doc.id!, {
            status: 'error',
            updatedAt: new Date(),
          })
        }
      }

      setLastProcessed(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR processing failed')
    } finally {
      setProcessing(false)
    }
  }, [isReady, db])

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