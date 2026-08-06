import { Layout } from '../components/layout/Layout'
import { LoginForm } from '../components/auth/LoginForm'

export function Login() {
  return (
    <Layout title="Sign In">
      <LoginForm />
    </Layout>
  )
}