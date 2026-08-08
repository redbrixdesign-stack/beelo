// Audio recorder utility for voice capture
// Handles MediaRecorder API with offline-first support

export interface AudioRecorderOptions {
  maxDurationMs?: number // default 300000 (5 minutes)
  mimeType?: string // default 'audio/m4a' or 'audio/webm'
  onDataAvailable?: (blob: Blob) => void
  onStop?: (blob: Blob, durationMs: number) => void
  onError?: (error: Error) => void
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private startTime: number = 0
  private maxDurationMs: number
  private mimeType: string
  private onDataAvailable?: (blob: Blob) => void
  private onStop?: (blob: Blob, durationMs: number) => void
  private onError?: (error: Error) => void
  private durationTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: AudioRecorderOptions = {}) {
    this.maxDurationMs = options.maxDurationMs || 300000 // 5 minutes
    this.mimeType = options.mimeType || this.getSupportedMimeType()
    this.onDataAvailable = options.onDataAvailable
    this.onStop = options.onStop
    this.onError = options.onError
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/m4a',
      'audio/mp4',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ]
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    return 'audio/webm' // fallback
  }

  async start(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      })

      this.mediaRecorder = new MediaRecorder(stream, { mimeType: this.mimeType })
      this.audioChunks = []
      this.startTime = Date.now()

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
          this.onDataAvailable?.(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: this.mimeType })
        const durationMs = Date.now() - this.startTime
        this.onStop?.(blob, durationMs)
        stream.getTracks().forEach(track => track.stop())
      }

      this.mediaRecorder.onerror = (event) => {
        const error = event.error as Error
        this.onError?.(error)
      }

      // Auto-stop after max duration
      this.durationTimer = setTimeout(() => {
        this.stop()
      }, this.maxDurationMs)

      this.mediaRecorder.start(1000) // collect data every second
    } catch (error) {
      this.onError?.(error instanceof Error ? error : new Error('Failed to start recording'))
      throw error
    }
  }

  stop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
    if (this.durationTimer) {
      clearTimeout(this.durationTimer)
      this.durationTimer = null
    }
  }

  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause()
      if (this.durationTimer) {
        clearTimeout(this.durationTimer)
        this.durationTimer = null
      }
    }
  }

  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume()
      const remainingMs = this.maxDurationMs - (Date.now() - this.startTime)
      if (remainingMs > 0) {
        this.durationTimer = setTimeout(() => this.stop(), remainingMs)
      }
    }
  }

  getState(): 'inactive' | 'recording' | 'paused' {
    return this.mediaRecorder?.state || 'inactive'
  }

  getDurationMs(): number {
    if (this.startTime === 0) return 0
    return Date.now() - this.startTime
  }

  getMimeType(): string {
    return this.mimeType
  }

  // Save audio blob to local filesystem (IndexedDB via FileSystem Access API or fallback)
  static async saveAudioBlob(blob: Blob, filename: string): Promise<string> {
    // Use FileSystem Access API if available (Chrome/Edge)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'Audio files',
            accept: { [blob.type]: ['.m4a', '.webm', '.ogg', '.mp4'] }
          }]
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        return handle.getFile().then((file: File) => file.name)
      } catch {
        // Fall through to fallback
      }
    }

    // Fallback: create object URL (temporary)
    return URL.createObjectURL(blob)
  }

  // Convert blob to base64 for storage/upload
  static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
}

// Hook for using AudioRecorder in React components
export function useAudioRecorder(options: AudioRecorderOptions = {}) {
  const [recorder, setRecorder] = useState<AudioRecorder | null>(null)
  const [state, setState] = useState<'inactive' | 'recording' | 'paused'>('inactive')
  const [durationMs, setDurationMs] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const recorder = new AudioRecorder({
      maxDurationMs: options.maxDurationMs,
      onDataAvailable: options.onDataAvailable,
      onStop: (blob, durationMs) => {
        setState('inactive')
        setDurationMs(durationMs)
        options.onStop?.(blob, durationMs)
      },
      onError: (err) => {
        setError(err)
        setState('inactive')
        options.onError?.(err)
      }
    })
    setRecorder(recorder)
    return () => {
      recorder.stop()
    }
  }, [])

  const start = async () => {
    if (!recorder) return
    setError(null)
    try {
      await recorder.start()
      setState('recording')
      // Update duration every 100ms
      const interval = setInterval(() => {
        if (recorder.getState() === 'recording') {
          setDurationMs(recorder.getDurationMs())
        } else {
          clearInterval(interval)
        }
      }, 100)
      return () => clearInterval(interval)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to start recording'))
    }
  }

  const stop = () => {
    recorder?.stop()
  }

  const pause = () => {
    recorder?.pause()
    setState('paused')
  }

  const resume = () => {
    recorder?.resume()
    setState('recording')
  }

  return {
    recorder,
    state,
    durationMs,
    error,
    start,
    stop,
    pause,
    resume,
    isRecording: state === 'recording',
    isPaused: state === 'paused'
  }
}

// Need to import useState, useEffect for the hook
import { useState, useEffect } from 'react'