import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFormOptions } from '../app/admin/(protected)/products/formOptions'

test('new managed categories and subcategories appear before any products use them', () => {
  const result = buildFormOptions([], [
    { id: 'h', name: 'Honey', parent_id: null, is_active: true },
    { id: 's', name: 'Sidr', parent_id: 'h', is_active: true },
    { id: 'x', name: 'Archived', parent_id: null, is_active: false },
    { id: 'o', name: 'Orphan', parent_id: 'missing', is_active: true },
  ])
  assert.deepEqual(result.categoryOptions, ['Honey'])
  assert.deepEqual(result.subcategoryOptionsByCategory.Honey, ['Sidr'])
})

test('managed categories preserve and deduplicate existing product labels', () => {
  const result = buildFormOptions([{ category: 'Honey', subcategory: 'Sidr' }, { category: 'Oils', subcategory: null }], [
    { id: 'h', name: 'Honey', parent_id: null, is_active: true },
    { id: 's', name: 'Sidr', parent_id: 'h', is_active: true },
  ])
  assert.deepEqual(result.categoryOptions, ['Honey', 'Oils'])
  assert.deepEqual(result.subcategoryOptionsByCategory.Honey, ['Sidr'])
})