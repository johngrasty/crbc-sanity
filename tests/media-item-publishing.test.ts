import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker} from './harness.ts'

const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)

test('a description is plain text of up to 5,000 characters', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  // é is two UTF-8 bytes, so this also shows the limit counts characters, not bytes.
  const atLimit = await studio.validate({...item, description: 'é'.repeat(5000)})
  assert.deepEqual(errorsAt(atLimit, 'description'), [])
  const pastLimit = await studio.validate({...item, description: 'é'.repeat(5001)})
  assert.equal(errorsAt(pastLimit, 'description').length, 1)

  const richText = [{_type: 'block', _key: 'a', children: [{_type: 'span', text: 'Hello'}]}]
  const markers = await studio.validate({...item, description: richText})
  assert.notDeepEqual(errorsAt(markers, 'description'), [])
})

test('a new media item publishes automatically', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  assert.equal(item.publicationPolicy, 'auto')
})

test('publication policy is required and is auto or manual', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  for (const publicationPolicy of ['auto', 'manual']) {
    const markers = await studio.validate({...item, publicationPolicy})
    assert.deepEqual(errorsAt(markers, 'publicationPolicy'), [], publicationPolicy)
  }
  for (const publicationPolicy of [undefined, '', 'automatic', 'Manual']) {
    const markers = await studio.validate({...item, publicationPolicy})
    assert.notDeepEqual(errorsAt(markers, 'publicationPolicy'), [], `${publicationPolicy}`)
  }
})
