import { Layout } from '@components/layout/Layout'
import { TripTracking } from '@features/trips/components/TripTracking'

export function TripTrackingPage() {
  return (
    <Layout title="Trip Tracking">
      <TripTracking />
    </Layout>
  )
}