import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/adminAuth'
import AdminChrome from '@/components/admin/AdminChrome'

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login')
  }

  return <AdminChrome>{children}</AdminChrome>
}
