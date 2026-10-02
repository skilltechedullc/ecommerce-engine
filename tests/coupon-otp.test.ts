import test from 'node:test'
import assert from 'node:assert/strict'
import { otpDigest, generateOtp, validBrowserSecret } from '../lib/server/couponOtpCrypto'
import { authenticationPayload, whatsappOtpReady } from '../lib/server/whatsappOtp'
test('OTP generation and digests bind purpose and challenge without storing plaintext',()=>{
 const secret='test-secret-not-a-credential-'.repeat(2)
 for(let i=0;i<30;i++)assert.match(generateOtp(),/^\d{6}$/)
 assert.equal(validBrowserSecret('a'.repeat(64)),true);assert.equal(validBrowserSecret('123456'),false)
 assert.notEqual(otpDigest(secret,'code','id1:123456'),otpDigest(secret,'code','id2:123456'))
 assert.notEqual(otpDigest(secret,'browser','same'),otpDigest(secret,'code','same'))
 assert.throws(()=>otpDigest('short','code','123456'))
})
test('Meta authentication payload supplies the same OTP to body and copy-code button',()=>{
 const payload=authenticationPayload('919000088888','012345','millco_coupon_otp','en_US')
 assert.equal(payload.type,'template');assert.equal(payload.template.components[0].parameters[0].text,'012345');assert.equal(payload.template.components[1].parameters[0].text,'012345');assert.equal(payload.template.components[1].sub_type,'url')
 assert.throws(()=>authenticationPayload('invalid','123456','test','en_US'))
 assert.throws(()=>authenticationPayload('919000088888','longcode','test','en_US'))
})
test('OTP readiness requires explicit enablement, approved template, secret and connection',()=>{
 const values={WHATSAPP_OTP_ENABLED:'true',WHATSAPP_OTP_TEMPLATE_APPROVED:'true',WHATSAPP_ACCESS_TOKEN:'test-token',WHATSAPP_PHONE_NUMBER_ID:'123',WHATSAPP_GRAPH_API_VERSION:'v25.0',WHATSAPP_OTP_TEMPLATE:'millco_coupon_otp',WHATSAPP_OTP_LANGUAGE:'en_US',COUPON_OTP_SECRET:'local-fixture-only-'.repeat(3)}
 const old={...process.env}
 try{Object.assign(process.env,values);assert.equal(whatsappOtpReady(),true);for(const key of Object.keys(values)){delete process.env[key];assert.equal(whatsappOtpReady(),false,key);Object.assign(process.env,values)}}finally{for(const key of Object.keys(values)){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key]}}
})
