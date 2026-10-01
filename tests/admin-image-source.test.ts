import test from 'node:test'
import assert from 'node:assert/strict'
import { productSchema, imageSourceSchema } from '../lib/server/schemas'
test('sample product edits retain built-in images', () => {
  assert.equal(productSchema.safeParse({ name:'Honey', slug:'honey', image:'/millco/sidr-honey.svg', images:['/millco/sidr-honey.svg'] }).success, true)
  assert.equal(imageSourceSchema.safeParse('https://example.com/photo.webp').success, true)
})
test('image sources reject executable URLs and disguised external paths', () => {
  for (const value of ['javascript:alert(1)','data:text/html,x','//evil.test/x','/../private','/\\evil.test/x','https://user:pass@example.com/x']) assert.equal(imageSourceSchema.safeParse(value).success,false,value)
})