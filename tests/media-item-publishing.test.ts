import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker} from './harness.ts'

const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)
const errors = (markers: Marker[]) => markers.filter((marker) => marker.level === 'error')
const warningsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'warning' && marker.path === path)

const holds = ['editorHold', 'rightsHold']

// Limits count Unicode code points, as the contract's JSON Schema does. é is one UTF-16 unit and
// two UTF-8 bytes. 😀 is outside the Basic Multilingual Plane, so it's two UTF-16 units.
const characters = ['é', '😀']

test('a description is plain text of up to 5,000 characters', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  for (const character of characters) {
    const atLimit = await studio.validate({...item, description: character.repeat(5000)})
    assert.deepEqual(errorsAt(atLimit, 'description'), [], character)
    const pastLimit = await studio.validate({...item, description: character.repeat(5001)})
    assert.equal(errorsAt(pastLimit, 'description').length, 1, character)
  }

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

test('a publish time is optional, and is an instant when set', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  assert.equal(item.publishAt, undefined)
  assert.deepEqual(errorsAt(await studio.validate(item), 'publishAt'), [])
  for (const publishAt of ['2026-10-11T13:00:00.000Z', '2026-10-11T13:00:00Z']) {
    const markers = await studio.validate({...item, publishAt})
    assert.deepEqual(errorsAt(markers, 'publishAt'), [], publishAt)
  }
  // A date or a wall time without a zone isn't an instant.
  for (const publishAt of [
    '2026-10-11',
    '2026-10-11T09:00:00',
    'next Sunday',
    '2026-02-30T13:00Z',
  ]) {
    const markers = await studio.validate({...item, publishAt})
    assert.notDeepEqual(errorsAt(markers, 'publishAt'), [], publishAt)
  }
})

test('a new media item has no editor hold and no rights hold', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  for (const hold of holds) {
    assert.equal((item[hold] as {active?: boolean} | undefined)?.active, false, hold)
  }
})

test('an active hold without a note is a warning, not an error', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  for (const hold of holds) {
    for (const note of [undefined, '', '   ']) {
      const markers = await studio.validate({...item, [hold]: {active: true, note}})
      assert.deepEqual(errors(markers), [], `${hold} with note ${JSON.stringify(note)}`)
      assert.equal(warningsAt(markers, `${hold}.note`).length, 1, `${hold} ${JSON.stringify(note)}`)
    }
    const noted = await studio.validate({...item, [hold]: {active: true, note: 'Music rights'}})
    assert.deepEqual(warningsAt(noted, `${hold}.note`), [], hold)
    const off = await studio.validate({...item, [hold]: {active: false}})
    assert.deepEqual(warningsAt(off, `${hold}.note`), [], hold)
  }
})

test('an item with no hold objects at all has no hold warnings or errors', async () => {
  const studio = createHarness()
  const {editorHold, rightsHold, ...item} = await studio.create('mediaItem')
  assert.ok(editorHold && rightsHold)
  const markers = await studio.validate(item)
  assert.deepEqual(errors(markers), [])
  for (const hold of holds) {
    assert.deepEqual(
      markers.filter(({path}) => path.startsWith(hold)),
      [],
      hold,
    )
  }
})

test('a hold note holds up to 500 characters', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  for (const hold of holds) {
    for (const character of characters) {
      const note = (length: number) => ({active: true, note: character.repeat(length)})
      const atLimit = await studio.validate({...item, [hold]: note(500)})
      assert.deepEqual(errorsAt(atLimit, `${hold}.note`), [], `${hold} ${character}`)
      const pastLimit = await studio.validate({...item, [hold]: note(501)})
      assert.equal(errorsAt(pastLimit, `${hold}.note`).length, 1, `${hold} ${character}`)
    }
  }
})

test('a placeholder item with no title or service date publishes, with warnings only', async () => {
  const studio = createHarness()
  const created = await studio.create('mediaItem')
  const published = await studio.publish(created._id)
  assert.equal(published._id, created._id.replace(/^drafts\./, ''))
  const markers = await studio.validate(published._id)
  assert.deepEqual(errors(markers), [])
  assert.equal(warningsAt(markers, 'title').length, 1)
  assert.equal(warningsAt(markers, 'serviceDate').length, 1)
})

test('the Media section lists held items, newest service date first', async () => {
  const item = (_id: string, title: string, serviceDate: string, holds = {}) => ({
    _id,
    _type: 'mediaItem',
    title,
    serviceDate,
    ...holds,
  })
  const on = {active: true, note: 'Waiting on music rights'}
  const studio = createHarness({
    documents: [
      item('editor', 'Editor hold', '2026-09-20', {editorHold: on}),
      item('rights', 'Rights hold', '2026-10-04', {rightsHold: on}),
      item('both', 'Both holds', '2026-09-27', {editorHold: on, rightsHold: on}),
      item('off', 'Holds off', '2026-10-11', {
        editorHold: {active: false},
        rightsHold: {active: false},
      }),
      item('none', 'No hold objects', '2026-10-11'),
      item('noted', 'A note but no active flag', '2026-10-11', {editorHold: {note: 'Old note'}}),
      item('added', 'Published without a hold', '2026-08-30'),
      item('drafts.added', 'Draft adds a hold', '2026-09-06', {editorHold: on}),
      item('cleared', 'Published with a hold', '2026-08-16', {rightsHold: on}),
      item('drafts.cleared', 'Draft clears the hold', '2026-08-16', {rightsHold: {active: false}}),
      item('versions.rSpring.release', 'Held only in a release', '2026-12-25', {editorHold: on}),
      {_id: 'news', _type: 'article', title: 'Not a media item', editorHold: on},
    ],
  })
  const {title, documents} = await studio.desk('media', 'heldItems')
  assert.equal(title, 'Held items')
  assert.deepEqual(
    documents?.map((document) => document.title),
    ['Rights hold', 'Both holds', 'Editor hold', 'Draft adds a hold'],
  )
})
