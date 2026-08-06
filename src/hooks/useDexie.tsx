import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { db } from '../lib/dexie'

interface DexieContextType {
  db: typeof db
  isReady: boolean
}

const DexieContext = createContext<DexieContextType | null>(null)

export function DexieProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    db.open().then(() => {
      setIsReady(true)
    }).catch((error) => {
      console.error('Failed to open Dexie database:', error)
      setIsReady(true)
    })
  }, [])

  return (
    <DexieContext.Provider value={{ db, isReady }}>
      {children}
    </DexieContext.Provider>
  )
}

export function useDexie() {
  const context = useContext(DexieContext)
  if (!context) {
    throw new Error('useDexie must be used within a DexieProvider')
  }
  return context
}