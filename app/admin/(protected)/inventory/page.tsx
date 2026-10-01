import Link from 'next/link'
import { requireAdminPermission } from '@/lib/adminAuth'
import { fetchInternalApi } from '@/lib/server/internalApi'

type InventoryEvent = {
  id: string
  product_id: string | null
  event_type: string
  quantity_before: number | null
  quantity_after: number | null
  quantity_delta: number | null
  note: string | null
  created_at: string
  products?: { name?: string | null; slug?: string | null } | null
  product_variants?: { weight?: string | null; sku?: string | null } | null
}

export default async function AdminInventoryPage() {
  await requireAdminPermission('inventory:read')
  const { events } = await fetchInternalApi<{ events: InventoryEvent[] }>('/api/admin/inventory?limit=150')

  return (
    <div className="admin-stack">
      <section className="admin-surface admin-toolbarCard">
        <div>
          <p className="admin-sectionEyebrow">Inventory</p>
          <h2 className="admin-sectionTitle">Stock change history</h2>
          <p className="admin-sectionText">Recent stock changes are recorded here. To adjust stock, open the product and edit its sizes.</p>
        </div>
      </section>
      <section className="admin-surface admin-tableCard">
        <div className="admin-tableWrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Product</th>
                <th>Variant</th>
                <th>Before</th>
                <th>After</th>
                <th>Delta</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {!events?.length ? <tr><td colSpan={7}>No stock changes yet. Stock updates will appear here after a product is added or edited.</td></tr> : null}
              {(events ?? []).map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.created_at).toLocaleString()}</td>
                  <td>{event.product_id ? <Link href={'/admin/products/' + event.product_id}>{event.products?.name ?? 'Open product'}</Link> : 'Deleted product'}</td>
                  <td>{event.product_variants?.weight ?? event.product_variants?.sku ?? 'Variant'}</td>
                  <td>{event.quantity_before ?? '-'}</td>
                  <td>{event.quantity_after ?? '-'}</td>
                  <td>{event.quantity_delta ?? '-'}</td>
                  <td>{event.note ?? event.event_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
