import crypto from 'node:crypto'
export const OTP_COOKIE = 'coupon_verification_session'
export function otpDigest(secret: string, purpose: string, value: string) {
 if (secret.length < 32) throw new Error('OTP secret must contain at least 32 characters')
 return crypto.createHmac('sha256', secret).update(purpose + ':' + value).digest('hex')
}
export function generateOtp() { return crypto.randomInt(0,1000000).toString().padStart(6,'0') }
export function validBrowserSecret(value: unknown): value is string { return typeof value==='string' && /^[a-f0-9]{64}$/.test(value) }
