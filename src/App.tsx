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
import { DocumentCapturePage } from './features/documents/components/DocumentCapturePage'
import { DocumentDetail } from './features/documents/components/DocumentDetail'
import { VoiceCaptureScreen } from './features/voice/components/VoiceCaptureScreen'
import { BatchReviewScreen } from './features/voice/components/BatchReviewScreen'
import { Leads } from './features/leads/components/LeadList'
import { LeadDetail } from './features/leads/components/LeadDetail'
import { LeadForm } from './features/leads/components/LeadForm'
import { SettingsScreen } from './features/settings/components/SettingsScreen'
import { MeasurementCheckForm } from './features/measurements/components/MeasurementCheckForm'
import { MeasurementCheckList } from './features/measurements/components/MeasurementCheckList'
import { IncidentList } from './features/incidents/components/IncidentList'
import { IncidentDetail } from './features/incidents/components/IncidentDetail'
import { DeliveryDropNoteView } from './features/delivery/components/DeliveryDropNoteView'
import { ExpensesPage, NewExpensePage } from './features/expenses/components/ExpensePageWrapper'
import { ExpenseReceiptView } from './features/expenses/components/ExpenseReceiptView'
import { DORPrediction } from './features/dor/components/DORPrediction'
import { OnboardingFlow } from './features/onboarding/components/OnboardingFlow'
import { TripTrackingPage } from './pages/TripTracking'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OnboardingGuard } from './features/onboarding/hooks/useOnboardingGuard'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }
  
  if (user) {
    return <Navigate to="/" replace />
  }
  
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}

function OnboardingProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <OnboardingGuard>
        {children}
      </OnboardingGuard>
    </ProtectedRoute>
  )
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
        <OnboardingProtectedRoute>
          <Layout title="Dashboard">
            <Home />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/visits" element={
        <OnboardingProtectedRoute>
          <Layout title="Visits">
            <Visits />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/visits/new" element={
        <OnboardingProtectedRoute>
          <Layout title="New Visit" showBack onBack={() => window.history.back()}>
            <VisitForm />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/visits/:id" element={
        <OnboardingProtectedRoute>
          <VisitDetail />
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/visits/:id/edit" element={
        <OnboardingProtectedRoute>
          <Layout title="Edit Visit" showBack onBack={() => window.history.back()}>
            <VisitForm />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/visits/:visitId/measurements" element={
        <OnboardingProtectedRoute>
          <Layout title="Measurements" showBack onBack={() => window.history.back()}>
            <MeasurementCheckList visitId={parseInt(window.location.pathname.split('/')[2])} checks={[]} onNew={() => window.history.pushState(null, '', `/visits/${window.location.pathname.split('/')[2]}/measurements/new`)} />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/visits/:visitId/measurements/new" element={
        <OnboardingProtectedRoute>
          <Layout title="New Measurement" showBack onBack={() => window.history.back()}>
            <MeasurementCheckForm visitId={parseInt(window.location.pathname.split('/')[2])} />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/visits/:visitId/measurements/:id" element={
        <OnboardingProtectedRoute>
          <Layout title="Edit Measurement" showBack onBack={() => window.history.back()}>
            <MeasurementCheckForm visitId={parseInt(window.location.pathname.split('/')[2])} checkId={parseInt(window.location.pathname.split('/')[4])} />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/incidents" element={
        <OnboardingProtectedRoute>
          <Layout title="Incidents">
            <IncidentList />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/incidents/:id" element={
        <OnboardingProtectedRoute>
          <IncidentDetail />
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/visits/:visitId/incidents" element={
        <OnboardingProtectedRoute>
          <Layout title="Incidents" showBack onBack={() => window.history.back()}>
            <IncidentList visitId={parseInt(window.location.pathname.split('/')[2])} />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/customers" element={
        <OnboardingProtectedRoute>
          <Layout title="Customers">
            <Customers />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/customers/new" element={
        <OnboardingProtectedRoute>
          <Layout title="New Customer" showBack onBack={() => window.history.back()}>
            <CustomerForm />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/customers/:id" element={
        <OnboardingProtectedRoute>
          <CustomerDetail />
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/customers/:id/edit" element={
        <OnboardingProtectedRoute>
          <Layout title="Edit Customer" showBack onBack={() => window.history.back()}>
            <CustomerForm />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <OnboardingProtectedRoute>
          <Profile />
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/sync" element={
        <OnboardingProtectedRoute>
          <Layout title="Sync Status">
            <SyncStatus />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/documents" element={
        <OnboardingProtectedRoute>
          <Layout title="Documents">
            <Documents />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/documents/capture" element={
        <OnboardingProtectedRoute>
          <DocumentCapturePage />
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/documents/:id" element={
        <OnboardingProtectedRoute>
          <DocumentDetail />
        </OnboardingProtectedRoute>
      } />
      
<Route path="/voice/capture" element={
        <OnboardingProtectedRoute>
          <VoiceCaptureScreen />
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/voice/review" element={
        <OnboardingProtectedRoute>
          <Layout title="Batch Review">
            <BatchReviewScreen />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/leads" element={
        <OnboardingProtectedRoute>
          <Layout title="Leads">
            <Leads />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/leads/new" element={
        <OnboardingProtectedRoute>
          <Layout title="New Lead" showBack onBack={() => window.history.back()}>
            <LeadForm />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/leads/:id" element={
        <OnboardingProtectedRoute>
          <Layout title="Lead Detail" showBack onBack={() => window.history.back()}>
            <LeadDetail />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <OnboardingProtectedRoute>
          <SettingsScreen />
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/onboarding" element={
        <ProtectedRoute>
          <OnboardingFlow />
        </ProtectedRoute>
      } />
      
      <Route path="/documents/:id/delivery" element={
        <OnboardingProtectedRoute>
          <DeliveryDropNoteView />
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/expenses" element={
        <OnboardingProtectedRoute>
          <ExpensesPage />
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/expenses/new" element={
        <OnboardingProtectedRoute>
          <NewExpensePage />
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/expenses/:id" element={
        <OnboardingProtectedRoute>
          <ExpenseReceiptView />
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/dor" element={
        <OnboardingProtectedRoute>
          <Layout title="DOR Prediction">
            <DORPrediction />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/pilot" element={
        <OnboardingProtectedRoute>
          <Layout title="Pilot Metrics">
            <PilotMetricsDashboard />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/trips/:visitId" element={
        <OnboardingProtectedRoute>
          <TripTrackingPage />
        </OnboardingProtectedRoute>
      } />
      
      <Route path="/sync" element={
        <OnboardingProtectedRoute>
          <Layout title="Sync Status">
            <SyncStatus />
          </Layout>
        </OnboardingProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}