import {readFileSync} from 'node:fs'
import {parseEnv} from 'node:util'
const e=parseEnv(readFileSync(process.argv[2]||'.env.millco','utf8'))
const required=['WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_ACCESS_TOKEN','WHATSAPP_APP_SECRET','WHATSAPP_VERIFY_TOKEN','WHATSAPP_GRAPH_API_VERSION','NEXT_PUBLIC_WHATSAPP_NUMBER','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_SITE_URL']
const missing=required.filter(k=>!e[k]?.trim())
const problems=[]
if(e.WHATSAPP_GRAPH_API_VERSION&&!/^v\d+\.0$/.test(e.WHATSAPP_GRAPH_API_VERSION))problems.push('Graph version must use vNN.0 format')
if(e.NEXT_PUBLIC_WHATSAPP_NUMBER&&!/^[1-9]\d{7,14}$/.test(e.NEXT_PUBLIC_WHATSAPP_NUMBER))problems.push('WhatsApp number must contain country code and digits only')
if(e.WHATSAPP_PROVIDER!=='meta')problems.push('This activation checklist requires provider meta')
if(e.NEXT_PUBLIC_SITE_URL&&!e.NEXT_PUBLIC_SITE_URL.startsWith('https://'))problems.push('Public webhook site must use HTTPS')
const templateKeys=['WHATSAPP_TEMPLATE_ORDER_CONFIRMED','WHATSAPP_TEMPLATE_ORDER_PROCESSING','WHATSAPP_TEMPLATE_ORDER_SHIPPED','WHATSAPP_TEMPLATE_ORDER_DELIVERED']
console.log('Incoming bot settings: '+(missing.length||problems.length?'INCOMPLETE':'PRESENT (not provider-verified)'))
if(missing.length)console.log('Missing: '+missing.join(', '))
for(const p of problems)console.log(p)
console.log('Order templates missing: '+(templateKeys.filter(k=>!e[k]).join(', ')||'none; approval still needs verification'))
console.log('Automation enabled: '+(e.WHATSAPP_ENABLED==='true'&&e.NEXT_PUBLIC_FEATURE_WHATSAPP_BOT==='true'))
console.log('AI routing enabled: '+(e.WHATSAPP_AI_ENABLED==='true'))
console.log('This check never calls Meta, sends messages, or prints credential values.')
process.exitCode=missing.length||problems.length?1:0