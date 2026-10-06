import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker} from './harness.ts'

const P = 'mi_01K6Z8Y4N3QJ5W2X7R9T0V1B2C'
const Q = 'mi_01K6Z9A7H2MXW4Q8C5R3T6V0BD'
const item = (_id: string, contentId?: string) => ({_id, _type: 'mediaItem', contentId})
const idErrors = (markers: Marker[]) =>
  markers
    .filter(({level, path}) => level === 'error' && path === 'contentId')
    .map(({message}) => message)

// The five editorial types and their ID fields. Types other tickets haven't registered yet are
// checked once they are.
const idFields = {
  mediaItem: 'contentId',
  serviceEvent: 'eventId',
  series: 'seriesId',
  speaker: 'speakerId',
  topic: 'topicId',
}

const registered = (studio: ReturnType<typeof createHarness>) =>
  Object.entries(idFields).filter(([type]) => studio.schemaType(type))

test('AI Assist never writes an editorial ID', () => {
  const studio = createHarness()
  const types = registered(studio)
  assert.ok(types.some(([type]) => type === 'mediaItem'))
  for (const [type, field] of types) {
    const id = studio.schemaType(type)?.fields.find(({name}) => name === field)
    assert.equal(id?.assistExcluded, true, type)
  }
})

// Every ID guard relies on drafts: with live edit, edits go straight to the published document
// and nothing validates them first (/tmp/studio-spec/reviews/ids-fable-5.1.md, finding 7).
test('no editorial type uses live edit', () => {
  const studio = createHarness()
  for (const [type] of registered(studio)) {
    assert.equal(studio.schemaType(type)?.liveEdit, false, type)
  }
})

// /tmp/studio-spec/reviews/ids-fable-5.1.md, finding 5.
test("a draft that copies a published item's ID doesn't block that item's own draft", async () => {
  const studio = createHarness({
    documents: [item('a', P), {...item('drafts.a', P), title: 'Edited'}, item('drafts.b', P)],
  })
  assert.deepEqual(idErrors(await studio.validate('drafts.a')), [])
  assert.deepEqual(idErrors(await studio.validate('a')), [])
  assert.deepEqual(idErrors(await studio.validate('drafts.b')), [
    'The media item a already uses this content ID. Ask a developer to fix it.',
  ])
})

test('two published items that share an ID both show an error that names the other', async () => {
  const studio = createHarness({documents: [item('a', P), item('b', P), item('drafts.a', P)]})
  for (const [id, other] of [
    ['a', 'b'],
    ['drafts.a', 'b'],
    ['b', 'a'],
  ]) {
    assert.deepEqual(
      idErrors(await studio.validate(id)),
      [`The media item ${other} already uses this content ID. Ask a developer to fix it.`],
      id,
    )
  }
})

// /tmp/studio-spec/reviews/ids-fable-5.1.md, finding 6.
test("a release version of an item that was never published must keep its draft's ID", async () => {
  const studio = createHarness({documents: [item('drafts.n', P), item('versions.rSpring.n', Q)]})
  assert.deepEqual(idErrors(await studio.validate('drafts.n')), [])
  assert.deepEqual(idErrors(await studio.validate('versions.rSpring.n')), [
    `The draft of this media item has the content ID ${P}. IDs never change, so discard this change.`,
  ])
  await assert.rejects(studio.publish('n', {release: 'rSpring'}), /contentId/)

  // A version with the draft's ID is fine, and so is one with no draft to compare with.
  for (const documents of [
    [item('drafts.n', P), item('versions.rSpring.n', P)],
    [item('drafts.n'), item('versions.rSpring.n', Q)],
    [item('versions.rSpring.n', Q)],
  ]) {
    const other = createHarness({documents})
    assert.deepEqual(idErrors(await other.validate('versions.rSpring.n')), [])
  }
})
