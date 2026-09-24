import test from 'node:test'
import assert from 'node:assert/strict'
import { escapeEmailText } from '../lib/emailHtml'
test('customer and product email text cannot inject HTML links or tags', () => {
  assert.equal(escapeEmailText('<a href="https://fake.example">Pay again</a> &'), '&lt;a href=&quot;https://fake.example&quot;&gt;Pay again&lt;/a&gt; &amp;')
})
