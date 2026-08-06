import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
import { DexieProvider } from './hooks/useDexie'
import { SyncProvider } from './hooks/useSync'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DexieProvider>
          <SyncProvider>
            <App />
          </SyncProvider>
        </DexieProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)