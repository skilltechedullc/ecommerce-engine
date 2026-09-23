import { requireAdminPermission } from '@/lib/adminAuth'
import { fetchInternalApi } from '@/lib/server/internalApi'
import MediaClient from './MediaClient'

export default async function AdminMediaPage() {
  await requireAdminPermission('media:manage')
  const { assets } = await fetchInternalApi<{
    assets: Array<{ path: string; public_url: string; size_bytes: number | null; content_type: string | null }>
  }>('/api/admin/media')

  return <MediaClient assets={assets ?? []} />
}
