import { Layout } from '../components/layout/Layout'
import { CustomerList } from '../components/customers/CustomerList'

export function Customers() {
  return (
    <Layout title="Customers">
      <CustomerList />
    </Layout>
  )
}