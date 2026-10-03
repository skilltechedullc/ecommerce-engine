import test from 'node:test'
import assert from 'node:assert/strict'
import {filterAdminOrders,storeDateKey,STORE_TIME_ZONE} from '../lib/adminOrders'

test('store dates and today filter agree across midnight',()=>{
 const time='2026-10-02T19:00:00Z'
 assert.equal(storeDateKey(time),STORE_TIME_ZONE==='Asia/Kolkata'?'2026-10-03':'2026-10-02')
 const rows=[{id:'a',created_at:time,status:'Paid'},{id:'b',created_at:'2026-10-01T12:00:00Z',status:'Paid'}]
 assert.deepEqual(filterAdminOrders(rows,{scope:'today'},new Date(time)).map(r=>r.id),['a'])
})
test('order exports and listings use combined search and dispatch filters',()=>{
 const rows=[{id:'a',created_at:null,status:'Paid',customer_email:'Buyer@example.com'},{id:'b',created_at:null,status:'Processing',customer_email:'buyer@example.com'},{id:'c',created_at:null,status:'Delivered',customer_email:'buyer@example.com'},{id:'d',created_at:null,status:'Paid',customer_email:'other@example.com'}]
 assert.deepEqual(filterAdminOrders(rows,{status:'awaiting_dispatch',q:' BUYER@ '}).map(r=>r.id),['a','b'])
 assert.equal(filterAdminOrders(rows,{q:'missing'}).length,0)
 assert.equal(filterAdminOrders(rows,{}).length,4)
})
