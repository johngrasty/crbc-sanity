import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type TestDocument} from './harness.ts'

// A media item that publishes without errors. Each published ID gets its own content ID.
const contentIds: Record<string, string> = {
  item: 'mi_01K6Z8Y4N3QJ5W2X7R9T0V1B2C',
  other: 'mi_01K6Z9A7H2MXW4Q8C5R3T6V0BD',
  weak: 'mi_01K6ZA3B5C7D9E1F2G4H6J8K0M',
}
const item = (_id: string): TestDocument => ({
  _id,
  _type: 'mediaItem',
  contentId: contentIds[_id.split('.').pop() as string],
  kind: 'service',
  serviceTimezone: 'America/New_York',
  publicationPolicy: 'auto',
})

// A service event that publishes without errors once its item does.
const event = (_id: string, mediaItem: Record<string, unknown>): TestDocument => ({
  _id,
  _type: 'serviceEvent',
  eventId: 'ev_01K6Z8Y4N3QJ5W2X7R9T0V1B2C',
  mediaItem,
  scheduledStart: {
    local: '2026-10-11T09:00',
    timeZone: 'America/New_York',
    offset: '-04:00',
    utc: '2026-10-11T13:00:00Z',
  },
  expectedDurationMinutes: 80,
  resourceId: 'lr_main',
  cancelled: false,
  socialGoLiveLeadMinutes: 5,
})

// What Studio stores when an editor picks an item that only has a draft.
const draftOnlyPick = {
  _type: 'reference',
  _ref: 'item',
  _weak: true,
  _strengthenOnPublish: {type: 'mediaItem'},
}

test('publishing makes a reference picked while its item was a draft strong', async () => {
  const studio = createHarness({
    documents: [item('drafts.item'), event('drafts.event', draftOnlyPick)],
  })
  await studio.publish('item')
  const published = await studio.publish('event')
  assert.deepEqual(published.mediaItem, {_type: 'reference', _ref: 'item'})
})

// Content Lake checks every strong reference in the document, so this holds even for one the
// schema doesn't declare, such as a field an importer wrote.
test("publishing refuses a strong reference to a document that isn't published", async () => {
  const studio = createHarness({
    documents: [
      item('drafts.item'),
      {...item('drafts.other'), related: {_type: 'reference', _ref: 'missing'}},
      {...item('drafts.weak'), related: {_type: 'reference', _ref: 'missing', _weak: true}},
    ],
  })
  assert.deepEqual(
    (await studio.validate('drafts.other')).filter(({level}) => level === 'error'),
    [],
  )
  await assert.rejects(studio.publish('other'), /strong reference to missing/)
  assert.ok(studio.documents().some(({_id}) => _id === 'drafts.other'))
  // A weak reference may point at anything.
  await studio.publish('weak')
})

// Publishing a release is one transaction, so an item in the same release counts.
test('a release publishes a strong reference to an item in the same release', async () => {
  const studio = createHarness({
    documents: [
      item('versions.rSpring.item'),
      event('versions.rSpring.event', {_type: 'reference', _ref: 'item'}),
    ],
  })
  await studio.publish('event', {release: 'rSpring'})
  await studio.publish('item', {release: 'rSpring'})
})

// A strong reference must name the published document itself. Sanity's publish leaves a literal
// draft or version ID as it is, and a published document can't strongly reference unpublished
// content, so the published "other" doesn't make drafts.other count, and neither does the draft.
for (const target of ['drafts.other', 'versions.rSpring.other']) {
  for (const exactExists of [false, true]) {
    test(`publishing refuses a strong reference to ${target}, ${exactExists ? 'which exists' : 'which is missing'}`, async () => {
      const pending = {
        ...item('drafts.item'),
        imported: {nested: [{_key: 'a', _type: 'reference', _ref: target}]},
      }
      const studio = createHarness({
        documents: [
          pending,
          {_id: 'other', _type: 'mediaItem'},
          ...(exactExists ? [{_id: target, _type: 'mediaItem'}] : []),
        ],
      })
      const before = studio.documents()
      await assert.rejects(studio.publish('item'), /strong reference to (drafts|versions)\./)
      // A refused publish changes nothing.
      assert.deepEqual(studio.documents(), before)
    })
  }
}

test('a weak reference may still name a draft', async () => {
  const studio = createHarness({
    documents: [
      {
        ...item('drafts.item'),
        imported: {nested: [{_key: 'a', _type: 'reference', _ref: 'drafts.other', _weak: true}]},
      },
    ],
  })
  const published = await studio.publish('item')
  assert.deepEqual(published.imported, {
    nested: [{_key: 'a', _type: 'reference', _ref: 'drafts.other', _weak: true}],
  })
})

// In a release, a strong reference names the item's published ID, and the item's version in
// the same release counts. Naming the version's own ID doesn't.
test('a release refuses a strong reference written as the version ID', async () => {
  const studio = createHarness({
    documents: [
      item('versions.rSpring.item'),
      event('versions.rSpring.event', {_type: 'reference', _ref: 'versions.rSpring.item'}),
    ],
  })
  await assert.rejects(
    studio.publish('event', {release: 'rSpring'}),
    /strong reference to versions\.rSpring\.item/,
  )
})
