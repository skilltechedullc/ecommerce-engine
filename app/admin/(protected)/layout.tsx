import { redirect } from 'next/navigation'
import { getAdminRole } from '@/lib/adminAuth'
import AdminChrome from '@/components/admin/AdminChrome'

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getAdminRole()
  if (!role) {
    redirect('/admin/login')
  }

  return <AdminChrome role={role} singlePassword={process.env.ADMIN_AUTH_MODE !== "database"} testPayments={Boolean(process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_"))}>{children}</AdminChrome>
}
