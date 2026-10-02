import {readFileSync} from 'node:fs'
import {parseEnv} from 'node:util'
const file=process.argv[2]
if(!file)throw new Error('Usage: node scripts/check-coupon-otp.mjs <private-env-file>')
const e=parseEnv(readFileSync(file,'utf8'))
const checks={
 WHATSAPP_OTP_ENABLED:e.WHATSAPP_OTP_ENABLED==='true',
 WHATSAPP_OTP_TEMPLATE_APPROVED:e.WHATSAPP_OTP_TEMPLATE_APPROVED==='true',
 WHATSAPP_ACCESS_TOKEN:!!e.WHATSAPP_ACCESS_TOKEN?.trim(),
 WHATSAPP_PHONE_NUMBER_ID:/^\d+$/.test(e.WHATSAPP_PHONE_NUMBER_ID??''),
 WHATSAPP_GRAPH_API_VERSION:/^v\d+\.\d+$/.test(e.WHATSAPP_GRAPH_API_VERSION??''),
 WHATSAPP_OTP_TEMPLATE:/^[a-z0-9_]+$/.test(e.WHATSAPP_OTP_TEMPLATE??''),
 WHATSAPP_OTP_LANGUAGE:/^[a-z]{2}(?:_[A-Z]{2})?$/.test(e.WHATSAPP_OTP_LANGUAGE??''),
 COUPON_OTP_SECRET:(e.COUPON_OTP_SECRET?.length??0)>=32,
}
for(const [name,ok] of Object.entries(checks))console.log((ok?'OK ':'MISSING / DISABLED ')+name)
console.log('Test-recipient restriction: '+(e.WHATSAPP_OTP_TEST_RECIPIENTS?.trim()?'configured':'not configured'))
console.log('Configuration checks do not confirm Meta approval or real message delivery. No message was sent.')
process.exitCode=Object.values(checks).every(Boolean)?0:1
