import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { Visits } from './pages/Visits'
import { VisitDetail } from './pages/VisitDetail'
import { VisitForm } from './components/visits/VisitForm'
import { Customers } from './pages/Customers'
import { CustomerDetail } from './pages/CustomerDetail'
import { CustomerForm } from './components/customers/CustomerForm'
import { Profile } from './pages/Profile'
import { Login } from './pages/Login'
import { SyncStatus } from './pages/SyncStatus'
import { Documents } from './pages/Documents'
import { DocumentCapture } from './features/documents/components/DocumentCapture'
import { DocumentDetail } from './features/documents/components/DocumentDetail'
import { VoiceCaptureScreen } from './features/voice/components/VoiceCaptureScreen'
import { BatchReviewScreen } from './features/voice/components/BatchReviewScreen'
import { Leads } from './features/leads/components/LeadList'
import { LeadDetail } from './features/leads/components/LeadDetail'
import { LeadForm } from './features/leads/components/LeadForm'
import { SettingsScreen } from './features/settings/components/SettingsScreen'
import { SyncStatus } from './pages/SyncStatus'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }
  
  if (user) {
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout title="Dashboard">
            <Home />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/visits" element={
        <ProtectedRoute>
          <Layout title="Visits">
            <Visits />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/visits/new" element={
        <ProtectedRoute>
          <Layout title="New Visit" showBack onBack={() => window.history.back()}>
            <VisitForm />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/visits/:id" element={
        <ProtectedRoute>
          <VisitDetail />
        </ProtectedRoute>
      } />
      
      <Route path="/visits/:id/edit" element={
        <ProtectedRoute>
          <Layout title="Edit Visit" showBack onBack={() => window.history.back()}>
            <VisitForm />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/customers" element={
        <ProtectedRoute>
          <Layout title="Customers">
            <Customers />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/customers/new" element={
        <ProtectedRoute>
          <Layout title="New Customer" showBack onBack={() => window.history.back()}>
            <CustomerForm />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/customers/:id" element={
        <ProtectedRoute>
          <CustomerDetail />
        </ProtectedRoute>
      } />
      
      <Route path="/customers/:id/edit" element={
        <ProtectedRoute>
          <Layout title="Edit Customer" showBack onBack={() => window.history.back()}>
            <CustomerForm />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      
      <Route path="/sync" element={
        <ProtectedRoute>
          <Layout title="Sync Status">
            <SyncStatus />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/documents" element={
        <ProtectedRoute>
          <Layout title="Documents">
            <Documents />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/documents/capture" element={
        <ProtectedRoute>
          <Layout title="Capture Document" showBack onBack={() => window.history.back()}>
            <DocumentCapture />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/documents/:id" element={
        <ProtectedRoute>
          <DocumentDetail />
        </ProtectedRoute>
      } />
      
<Route path="/voice/capture" element={
        <ProtectedRoute>
          <VoiceCaptureScreen />
        </ProtectedRoute>
      } />
      
      <Route path="/voice/review" element={
        <ProtectedRoute>
          <Layout title="Batch Review">
            <BatchReviewScreen />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/leads" element={
        <ProtectedRoute>
          <Layout title="Leads">
            <Leads />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/leads/new" element={
        <ProtectedRoute>
          <Layout title="New Lead" showBack onBack={() => window.history.back()}>
            <LeadForm />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/leads/:id" element={
        <ProtectedRoute>
          <Layout title="Lead Detail" showBack onBack={() => window.history.back()}>
            <LeadDetail />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute>
          <SettingsScreen />
        </ProtectedRoute>
      } />
      
      <Route path="/sync" element={
        <ProtectedRoute>
          <Layout title="Sync Status">
            <SyncStatus />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}