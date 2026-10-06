import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker} from './harness.ts'

const P = 'mi_01K6Z8Y4N3QJ5W2X7R9T0V1B2C'
const Q = 'mi_01K6Z9A7H2MXW4Q8C5R3T6V0BD'
const item = (_id: string, contentId?: string) => ({_id, _type: 'mediaItem', contentId})
// A media item that publishes without errors.
const publishable = {
  kind: 'service',
  title: 'Easter Sunday',
  serviceDate: '2026-04-05',
  serviceTimezone: 'America/New_York',
  publicationPolicy: 'auto',
}
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

// /tmp/studio-spec/reviews/ids-fable-5.1.md, finding 1. Unpublish has no validation gate, and
// after it there's no published ID left to compare with.
test("a paste can't carry a new ID through Unpublish and Publish", async () => {
  const studio = createHarness({documents: [{...item('item', P), ...publishable}]})
  const pasted = {...publishable, title: 'Pasted', contentId: Q}
  const draft = await studio.edit('item', {set: pasted})
  assert.equal(draft.title, 'Pasted')
  assert.equal(draft.contentId, P)
  await studio.unpublish('item')
  assert.deepEqual(
    studio.documents().map(({_id}) => _id),
    ['drafts.item'],
  )
  assert.equal((await studio.publish('item')).contentId, P)
})

test('an ID written to a draft through the API goes back to the published one on the next edit', async () => {
  const studio = createHarness({documents: [item('item', P), item('drafts.item', Q)]})
  assert.equal((await studio.edit('item', {set: {title: 'Easter'}})).contentId, P)
})

test("a release version keeps the published ID, or before the first publish its draft's", async () => {
  const published = createHarness({documents: [item('item', P)]})
  const version = await published.edit('item', {set: {contentId: Q}}, {release: 'rSpring'})
  assert.equal(version.contentId, P)

  const unpublished = createHarness({documents: [item('drafts.n', P)]})
  const first = await unpublished.edit('n', {set: {contentId: Q}}, {release: 'rSpring'})
  assert.equal(first.contentId, P)
  // A draft that was never published has no ID to keep. The ID rules check what it carries.
  assert.equal((await unpublished.edit('n', {set: {contentId: Q}})).contentId, Q)
})

// The step goes by type name, so it holds for types other tickets haven't registered yet.
test('every editorial type keeps its published ID', async () => {
  for (const [type, field] of Object.entries(idFields)) {
    const studio = createHarness({documents: [{_id: 'doc', _type: type, [field]: 'published'}]})
    const draft = await studio.edit('doc', {set: {[field]: 'pasted'}})
    assert.equal(draft[field], 'published', type)
  }
})

test("one edit to a service event gets both its ID step's patch and its slot length step's", async () => {
  const eventId = 'ev_01K6Z8Y4N3QJ5W2X7R9T0V1B2C'
  const studio = createHarness({
    documents: [
      {
        _id: 'event',
        _type: 'serviceEvent',
        eventId,
        scheduledStart: {timeZone: 'America/New_York'},
      },
    ],
  })
  const sunday = {
    local: '2026-10-11T09:00',
    timeZone: 'America/New_York',
    offset: '-04:00',
    utc: '2026-10-11T13:00:00Z',
  }
  const draft = await studio.edit('event', {
    set: {eventId: 'ev_01K6Z9A7H2MXW4Q8C5R3T6V0BD', scheduledStart: sunday},
  })
  assert.equal(draft.eventId, eventId)
  assert.equal(draft.expectedDurationMinutes, 80)
})
