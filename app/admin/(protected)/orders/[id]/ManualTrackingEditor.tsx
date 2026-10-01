'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
export default function ManualTrackingEditor({orderId,shipment}:{orderId:string;shipment:{awb_number:string|null;tracking_url:string|null;status:string|null}|null}) {
  const router=useRouter()
  const [awb,setAwb]=useState(shipment?.awb_number??'')
  const [url,setUrl]=useState(shipment?.tracking_url??'')
  const [status,setStatus]=useState(shipment?.status??'pending')
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
  return <form className="admin-stack" style={{marginTop:20}} onSubmit={async event=>{
    event.preventDefault();setBusy(true);setMessage('');setError('')
    try {const r=await fetch('/api/admin/shipping/manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId,awb,trackingUrl:url,status})});const data=await r.json();if(!r.ok)throw Error(data.error||'Could not save tracking');setMessage('Tracking saved. Update the order status separately when ready to notify the customer.');router.refresh()}catch(e){setError(e instanceof Error?e.message:'Could not save tracking')}finally{setBusy(false)}
  }}><h3>Manual courier tracking</h3><p className="admin-sectionText">Book delivery with your courier, then enter their tracking details. Saving this form does not book a pickup, change the order status or send a message.</p><label className="admin-inputShell"><span>Tracking reference / AWB</span><input value={awb} onChange={e=>setAwb(e.target.value)} required maxLength={100}/></label><label className="admin-inputShell"><span>Courier tracking link (optional)</span><input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://courier.example/track/..." maxLength={2048}/></label><label className="admin-inputShell"><span>Shipment status</span><select value={status} onChange={e=>setStatus(e.target.value)}>{['pending','pickup_scheduled','picked_up','in_transit','out_for_delivery','delivered','failed','cancelled'].map(s=><option value={s} key={s}>{s.replaceAll('_',' ')}</option>)}</select></label><button className="admin-button admin-button--primary" disabled={busy}>{busy?'Saving…':'Save tracking'}</button>{message?<p role="status">{message}</p>:null}{error?<p role="alert" className="admin-inlineMessage admin-inlineMessage--error">{error}</p>:null}</form>
}