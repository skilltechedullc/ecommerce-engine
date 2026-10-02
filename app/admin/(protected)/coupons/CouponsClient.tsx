'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { couponWriteSchema, type Coupon } from '@/lib/coupons'
import { moneyWithSymbol } from '@/lib/money'

function localDate(value: string | null) {
 if (!value) return ''
 const d = new Date(value)
 return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16)
}
export default function CouponsClient({ coupons, otpReady }: { coupons: Coupon[]; otpReady: boolean }) {
 const router = useRouter()
 const [editing, setEditing] = useState<Coupon | null>(null)
 const [formKey, setFormKey] = useState(0)
 const [requireOtp, setRequireOtp] = useState(true)
 const [saving, setSaving] = useState(false)
 const [message, setMessage] = useState('')
 const [error, setError] = useState('')
 function edit(c: Coupon | null) { setEditing(c); setRequireOtp(c?.require_whatsapp_otp ?? true); setFormKey(k=>k+1); setMessage(''); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }
 async function save(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault(); setSaving(true); setError(''); setMessage('')
  try {
   const f = new FormData(event.currentTarget)
   const optional = (name: string) => f.get(name) ? Number(f.get(name)) : null
   const date = (name: string) => f.get(name) ? new Date(String(f.get(name))).toISOString() : null
   const input = couponWriteSchema.safeParse({ id: editing?.id, code: f.get('code'), discount_type: f.get('discount_type'), discount_value: Number(f.get('discount_value')), min_order_amount: Number(f.get('min_order_amount')), max_discount_amount: optional('max_discount_amount'), usage_limit: optional('usage_limit'), starts_at: date('starts_at'), expires_at: date('expires_at'), is_active: (!requireOtp || otpReady) && f.get('is_active') === 'on', require_whatsapp_otp: requireOtp, one_per_phone: f.get('one_per_phone') === 'on', one_per_email: f.get('one_per_email') === 'on' })
   if (!input.success) throw new Error(input.error.issues[0].message)
   const res = await fetch('/api/admin/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input.data) })
   const data = await res.json()
   if (!res.ok) throw new Error(data.error || 'Could not save coupon')
   setEditing(null); setRequireOtp(true); setFormKey(k=>k+1); setMessage('Coupon saved.'); router.refresh()
  } catch (e) { setError(e instanceof Error ? e.message : 'Could not save coupon') } finally { setSaving(false) }
 }
 return <div className="admin-stack">
  <section className="admin-surface admin-toolbarCard">
   <div><p className="admin-sectionEyebrow">Offers</p><h2 className="admin-sectionTitle">{editing ? 'Edit '+editing.code : 'Create a coupon'}</h2><p className="admin-sectionText">One coupon per online payment. Discounts apply to products; delivery is calculated after the discount. Changes affect new checkouts only.</p></div>
   <form key={formKey} onSubmit={save} className="admin-stack">
    <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
    <label className="admin-inputShell"><span className="admin-inputShell__label">Coupon code</span><input name="code" defaultValue={editing?.code ?? ''} placeholder="MILLCO10" minLength={3} maxLength={32} required /></label>
    <label className="admin-inputShell"><span className="admin-inputShell__label">Discount type</span><select name="discount_type" defaultValue={editing?.discount_type ?? 'percentage'}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed amount</option></select></label>
    <label className="admin-inputShell"><span className="admin-inputShell__label">Discount value</span><input name="discount_value" type="number" min="0.01" step="0.01" defaultValue={editing?.discount_value ?? 10} required /></label>
    <label className="admin-inputShell"><span className="admin-inputShell__label">Minimum product total</span><input name="min_order_amount" type="number" min="0" step="0.01" defaultValue={editing?.min_order_amount ?? 0} required /></label>
    <label className="admin-inputShell"><span className="admin-inputShell__label">Maximum discount (optional)</span><input name="max_discount_amount" type="number" min="0.01" step="0.01" placeholder="No cap" defaultValue={editing?.max_discount_amount ?? ''} /></label>
    <label className="admin-inputShell"><span className="admin-inputShell__label">Usage limit (optional)</span><input name="usage_limit" type="number" min="1" step="1" placeholder="Unlimited" defaultValue={editing?.usage_limit ?? ''} /></label>
    <label className="admin-inputShell"><span className="admin-inputShell__label">Starts (your local time)</span><input name="starts_at" type="datetime-local" defaultValue={localDate(editing?.starts_at ?? null)} /></label>
    <label className="admin-inputShell"><span className="admin-inputShell__label">Expires (your local time)</span><input name="expires_at" type="datetime-local" defaultValue={localDate(editing?.expires_at ?? null)} /></label>
    </div>
    <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
      <label><input type="checkbox" name="require_whatsapp_otp" checked={requireOtp} onChange={e=>setRequireOtp(e.target.checked)} /> Require WhatsApp OTP verification</label>
      <label><input type="checkbox" name="one_per_phone" defaultChecked={editing?.one_per_phone ?? true} /> One use per phone number for this coupon</label>
      <label><input type="checkbox" name="one_per_email" defaultChecked={editing?.one_per_email ?? true} /> Block reuse of the same email for this coupon</label>
      <p className="admin-sectionText">If either enabled contact rule matches an earlier checkout, another use is blocked. Pending payments also reserve a use. Email is a duplicate check, not proof of ownership.</p>
      {requireOtp && !otpReady ? <p role="status" className="admin-inlineMessage">WhatsApp code entry is ready, but sending is not activated. This coupon stays disabled until the Meta connection and template are tested.</p> : !requireOtp ? <p className="admin-sectionText">Without OTP, contact checks use the details entered at checkout and cannot prove ownership.</p> : <p className="admin-sectionText">WhatsApp verification is connected. Test delivery before publishing this offer.</p>}
    </div>
    <label style={{ display: 'block', margin: '20px 0' }}><input name="is_active" type="checkbox" disabled={requireOtp && !otpReady} defaultChecked={editing?.is_active ?? false} /> Enabled</label>
    <div style={{ display: 'flex', gap: 12 }}><button className="admin-button admin-button--primary">{saving ? 'Saving…' : 'Save coupon'}</button>{editing && <button type="button" className="admin-button admin-button--secondary" onClick={()=>edit(null)}>Cancel edit</button>}</div>
    </fieldset>
   </form>
   {message && <p role="status" className="admin-inlineMessage admin-inlineMessage--success">{message}</p>}
   {error && <p role="alert" className="admin-inlineMessage admin-inlineMessage--error">{error}</p>}
  </section>
  <section className="admin-surface admin-tableCard">
   <div style={{ padding: 24 }}><h2 className="admin-sectionTitle">Your coupons</h2><p className="admin-sectionText">Pending payment checkouts reserve a use and count toward the limit, even if the payment window is closed. This protects the limit if a customer pays later. Increase the limit if needed. Completed uses are retained after cancellation or refund.</p></div>
   <div className="admin-tableWrap"><table className="admin-table"><thead><tr><th>Code</th><th>Discount</th><th>Protection</th><th>Status</th><th>Completed / pending</th><th>Limit</th><th>Action</th></tr></thead><tbody>
    {coupons.map(c=><tr key={c.id}><td><strong>{c.code}</strong><div>Min. {moneyWithSymbol(c.min_order_amount)}{c.max_discount_amount ? ' · Cap '+moneyWithSymbol(c.max_discount_amount) : ''}</div></td><td>{c.discount_type === 'percentage' ? c.discount_value+'%' : moneyWithSymbol(c.discount_value)}</td><td>{c.require_whatsapp_otp ? (otpReady ? 'WhatsApp OTP' : 'WhatsApp OTP (setup pending)') : 'No OTP'}{c.one_per_phone && <div>Once per phone</div>}{c.one_per_email && <div>Once per email</div>}</td><td>{!c.is_active ? 'Disabled' : c.expires_at && Date.parse(c.expires_at) <= Date.now() ? 'Expired' : c.starts_at && Date.parse(c.starts_at) > Date.now() ? 'Scheduled' : c.usage_limit && (c.used ?? 0)+(c.reserved ?? 0)>=c.usage_limit ? 'Limit reached' : 'Active'}</td><td>{c.used ?? 0} / {c.reserved ?? 0}</td><td>{c.usage_limit ?? 'Unlimited'}</td><td><button disabled={saving} className="admin-button admin-button--secondary admin-button--small" onClick={()=>edit(c)}>Edit</button></td></tr>)}
    {!coupons.length && <tr><td colSpan={7}>No coupons yet. Create your first offer above.</td></tr>}
   </tbody></table></div>
  </section>
 </div>
}
