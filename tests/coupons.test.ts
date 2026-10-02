import test from 'node:test'
import assert from 'node:assert/strict'
import { couponDiscount, couponWriteSchema, normalizeCouponCode, type Coupon } from '../lib/coupons'
import { calculateShippingRate } from '../lib/shipping/rates'
const coupon: Coupon = { id: 'f29af58a-0234-4b59-b72b-cf79b3451630', code: 'MILLCO10', discount_type: 'percentage', discount_value: 10, min_order_amount: 0, max_discount_amount: null, starts_at: null, expires_at: null, usage_limit: null, is_active: true }
test('coupon codes normalize and reject malformed inputs',()=>{assert.equal(normalizeCouponCode(' millco10 '),'MILLCO10');assert.throws(()=>normalizeCouponCode({}));assert.throws(()=>normalizeCouponCode('x'.repeat(33)))})
test('percentage/fixed discounts, caps and paise rounding',()=>{assert.equal(couponDiscount(coupon,249),24.9);assert.equal(couponDiscount({...coupon,discount_value:12.5},99.99),12.5);assert.equal(couponDiscount({...coupon,max_discount_amount:50},1000),50);assert.equal(couponDiscount({...coupon,discount_type:'fixed',discount_value:75},500),75)})
test('minimum, dates, disable, usage and zero-value payment guards',()=>{for(const patch of [{is_active:false},{starts_at:'2099-01-01T00:00:00Z'},{expires_at:'2000-01-01T00:00:00Z'},{min_order_amount:2000},{usage_limit:1}])assert.throws(()=>couponDiscount({...coupon,...patch},1000,1));assert.throws(()=>couponDiscount({...coupon,discount_type:'fixed',discount_value:1000},1000));assert.equal(couponDiscount({...coupon,usage_limit:2},1000,1),100)})
test('delivery threshold is applied after discount including exact boundary',()=>{const rules={flatRate:50,freeShippingThreshold:1000};assert.equal(calculateShippingRate(1000-couponDiscount(coupon,1000),rules).total,950);assert.equal(calculateShippingRate(1250-couponDiscount({...coupon,discount_value:20},1250),rules).shippingAmount,0)})
test('admin schema rejects unsafe/unpayable values and inverted dates',()=>{assert.equal(couponWriteSchema.safeParse(coupon).success,true);for(const patch of [{discount_value:100},{discount_value:NaN},{usage_limit:1.5},{min_order_amount:-1},{code:'<bad>'},{starts_at:'2026-10-03T00:00:00Z',expires_at:'2026-10-02T00:00:00Z'}])assert.equal(couponWriteSchema.safeParse({...coupon,...patch}).success,false)})

import { moneyWithSymbol, formatMoney } from '../lib/money'
test('currency displays preserve coupon paise',()=>{assert.match(moneyWithSymbol(499.1),/499\.10/);assert.match(formatMoney(499.1),/499\.10/);assert.match(moneyWithSymbol(499),/499$/)})
