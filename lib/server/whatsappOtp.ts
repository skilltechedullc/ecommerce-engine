import { HttpError } from '@/lib/server/api'
export function whatsappOtpReady() {
 return process.env.WHATSAPP_OTP_ENABLED==='true' && process.env.WHATSAPP_OTP_TEMPLATE_APPROVED==='true'
  && !!process.env.WHATSAPP_ACCESS_TOKEN && /^\d+$/.test(process.env.WHATSAPP_PHONE_NUMBER_ID ?? '')
  && /^v\d+\.\d+$/.test(process.env.WHATSAPP_GRAPH_API_VERSION ?? '')
  && /^[a-z0-9_]+$/.test(process.env.WHATSAPP_OTP_TEMPLATE ?? '')
  && /^[a-z]{2}(?:_[A-Z]{2})?$/.test(process.env.WHATSAPP_OTP_LANGUAGE ?? '')
  && (process.env.COUPON_OTP_SECRET?.length ?? 0)>=32
}
export function requireWhatsappOtpReady() {
 if (!whatsappOtpReady()) throw new HttpError(503, 'WhatsApp verification is not available yet. You can continue without a coupon.', 'COUPON_VERIFICATION_UNAVAILABLE')
}
export function authenticationPayload(phone: string, code: string, template: string, language: string) {
 if (!/^\d{8,15}$/.test(phone) || !/^\d{6}$/.test(code)) throw new Error('Invalid OTP delivery input')
 return { messaging_product:'whatsapp', recipient_type:'individual', to:phone, type:'template', template:{name:template,language:{code:language},components:[{type:'body',parameters:[{type:'text',text:code}]},{type:'button',sub_type:'url',index:'0',parameters:[{type:'text',text:code}]}]} }
}
export async function sendWhatsappOtp(phone: string, code: string) {
 requireWhatsappOtpReady()
 const allowed=(process.env.WHATSAPP_OTP_TEST_RECIPIENTS ?? '').split(',').map(s=>s.replace(/\D/g,'')).filter(Boolean)
 if (allowed.length && !allowed.includes(phone)) throw new HttpError(403, 'WhatsApp verification is currently limited to store test numbers.', 'OTP_TEST_RECIPIENT_ONLY')
 try {
  const response=await fetch('https://graph.facebook.com/'+process.env.WHATSAPP_GRAPH_API_VERSION+'/'+process.env.WHATSAPP_PHONE_NUMBER_ID+'/messages',{
   method:'POST', headers:{Authorization:'Bearer '+process.env.WHATSAPP_ACCESS_TOKEN,'Content-Type':'application/json'},
   body:JSON.stringify(authenticationPayload(phone,code,process.env.WHATSAPP_OTP_TEMPLATE!,process.env.WHATSAPP_OTP_LANGUAGE!)),signal:AbortSignal.timeout(10000),cache:'no-store',
  })
  const data=await response.json()
  if (!response.ok || typeof data.messages?.[0]?.id!=='string') throw new Error('Provider did not accept OTP')
 } catch { throw new HttpError(503,'Could not send a verification code. Please wait a minute and try again.','OTP_DELIVERY_FAILED') }
}
