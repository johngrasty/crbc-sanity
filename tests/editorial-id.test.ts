import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker, type TestDocument} from './harness.ts'

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
// and nothing validates them first. Fable 5.1's ID review, finding 7:
// https://github.com/johngrasty/crbc-sanity/pull/14#issuecomment-6027403481
test('no editorial type uses live edit', () => {
  const studio = createHarness()
  for (const [type] of registered(studio)) {
    assert.equal(studio.schemaType(type)?.liveEdit, false, type)
  }
})

// A stray draft must not block the published document that owns the ID. Fable 5.1's ID review,
// finding 5: https://github.com/johngrasty/crbc-sanity/pull/14#issuecomment-6027403481
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

// Before the first publish, a release version keeps its draft's ID. Fable 5.1's ID review,
// finding 6: https://github.com/johngrasty/crbc-sanity/pull/14#issuecomment-6027403481
test("a release version of an item that was never published must keep its draft's ID", async () => {
  const studio = createHarness({documents: [item('drafts.n', P), item('versions.rSpring.n', Q)]})
  assert.deepEqual(idErrors(await studio.validate('drafts.n')), [])
  assert.deepEqual(idErrors(await studio.validate('versions.rSpring.n')), [
    `The draft of this media item has the content ID ${P}. Open this version and Studio gives it the draft's ID.`,
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

// Fable 5.1's ID review, finding 1: https://github.com/johngrasty/crbc-sanity/pull/14#issuecomment-6027403481
// Unpublish has no validation gate, and
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

// The form runs its steps once the document loads, so a pasted ID, or one an API write left,
// goes back before the editor can Unpublish.
test('a changed ID goes back to the one it has to keep as soon as the form opens', async () => {
  const studio = createHarness({
    documents: [item('item', P), item('drafts.item', Q), item('versions.rSpring.item', Q)],
  })
  assert.equal((await studio.open('item')).contentId, P)
  assert.equal((await studio.open('item', {release: 'rSpring'})).contentId, P)
  for (const _id of ['drafts.item', 'versions.rSpring.item']) {
    assert.equal(studio.documents().find((document) => document._id === _id)?.contentId, P)
    assert.deepEqual(idErrors(await studio.validate(_id)), [], _id)
  }

  const unpublished = createHarness({
    documents: [item('drafts.n', P), item('versions.rSpring.n', Q)],
  })
  assert.equal((await unpublished.open('n', {release: 'rSpring'})).contentId, P)
})

test('opening an item whose versions keep its ID writes nothing', async () => {
  const documents = [item('drafts.item', P), item('item', P)]
  const studio = createHarness({documents})
  await studio.open('item')
  assert.deepEqual(studio.documents(), documents)
  const published = createHarness({documents: [item('item', P)]})
  await published.open('item')
  assert.deepEqual(
    published.documents().map(({_id}) => _id),
    ['item'],
  )
})

const slug = (current: string) => ({_type: 'slug', current})
const history = (document: TestDocument) =>
  ((document.slugHistory ?? []) as {current: string}[]).map(({current}) => current)

test('on a media item, the ID step and slug history both apply when the form opens and on each edit', async () => {
  const published = {...item('item', P), slug: slug('easter')}
  // Written through the API with another ID and a new slug, and no history.
  const written = {...published, _id: 'drafts.item', contentId: Q, slug: slug('easter-sunday')}
  const studio = createHarness({documents: [published, written]})
  const opened = await studio.open('item')
  assert.equal(opened.contentId, P)
  assert.deepEqual(history(opened), ['easter'])

  const edited = await studio.edit('item', {
    set: {contentId: Q, slug: slug('easter-sunday-2026')},
  })
  assert.equal(edited.contentId, P)
  assert.deepEqual(history(edited), ['easter'])
})

test('on a service event, the ID step runs when the form opens, and the slot length step only on a change', async () => {
  const eventId = 'ev_01K6Z8Y4N3QJ5W2X7R9T0V1B2C'
  const sunday = {
    local: '2026-10-11T09:00',
    timeZone: 'America/New_York',
    offset: '-04:00',
    utc: '2026-10-11T13:00:00Z',
  }
  const event = {_id: 'event', _type: 'serviceEvent', eventId, scheduledStart: sunday}
  const pasted = {...event, _id: 'drafts.event', eventId: 'ev_01K6Z9A7H2MXW4Q8C5R3T6V0BD'}
  const studio = createHarness({documents: [event, pasted]})
  const opened = await studio.open('event')
  assert.equal(opened.eventId, eventId)
  assert.equal(opened.expectedDurationMinutes, undefined)
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

// Fable 5.1's ID review, finding 4: https://github.com/johngrasty/crbc-sanity/pull/14#issuecomment-6027403481
// A history restore or an API write can
// leave a published item's draft without an ID.
test('Assign uses the ID the item has to keep, and mints one only when there is none', () => {
  const restored = createHarness({documents: [item('item', P), item('drafts.item')]})
  assert.equal(restored.assignedId('item'), P)

  const beforeFirstPublish = createHarness({
    documents: [item('drafts.n', P), item('versions.rSpring.n')],
  })
  assert.equal(beforeFirstPublish.assignedId('n', {release: 'rSpring'}), P)

  const contentId = /^mi_[0-9A-HJKMNP-TV-Z]{26}$/
  // Published without an ID, and never published.
  const imported = createHarness({documents: [item('item'), item('drafts.new')]})
  assert.match(imported.assignedId('item'), contentId)
  assert.match(imported.assignedId('new'), contentId)
  assert.notEqual(imported.assignedId('new'), imported.assignedId('new'))
})
