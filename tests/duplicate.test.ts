import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker, type TestDocument} from './harness.ts'

const editorialTypes = ['mediaItem', 'serviceEvent', 'series', 'speaker', 'topic'] as const
type EditorialType = (typeof editorialTypes)[number]

// Contract section 2: each kind's prefix and a ULID, 26 characters of Crockford base32.
const ids = {
  mediaItem: {field: 'contentId', pattern: /^mi_[0-9A-HJKMNP-TV-Z]{26}$/},
  serviceEvent: {field: 'eventId', pattern: /^ev_[0-9A-HJKMNP-TV-Z]{26}$/},
  series: {field: 'seriesId', pattern: /^se_[0-9A-HJKMNP-TV-Z]{26}$/},
  speaker: {field: 'speakerId', pattern: /^sp_[0-9A-HJKMNP-TV-Z]{26}$/},
  topic: {field: 'topicId', pattern: /^tp_[0-9A-HJKMNP-TV-Z]{26}$/},
}

const ULID = '01K6Z8Y4N3QJ5W2X7R9T0V1B2C'
const OTHER_ULID = '01K6Z9A7H2MXW4Q8C5R3T6V0BD'
const reference = (_key: string, _ref: string) => ({_key, _type: 'reference', _ref})
const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)

// Every type is seeded with the slug, the slug history and the import source, whether or not
// its schema has them yet, so these tests hold before the other type tickets merge.
const unique = {
  slug: {_type: 'slug', current: 'easter-sunday'},
  slugHistory: [{_key: 'h1', _type: 'slug', current: 'easter'}],
  source: {
    sourceId: 'subsplash-1234',
    sourceUrl: 'https://subsplash.com/crbc/media/mi/+abc1234',
    originalPublishedAt: '2024-03-31T13:00:00Z',
  },
}

const originals: Record<EditorialType, TestDocument> = {
  mediaItem: {
    _id: 'item',
    _type: 'mediaItem',
    contentId: `mi_${ULID}`,
    kind: 'sermon',
    title: 'Easter Sunday',
    serviceDate: '2026-04-05',
    serviceTimezone: 'America/New_York',
    speakers: [reference('s1', 'pastor')],
    series: [reference('r1', 'gospel')],
    ...unique,
    audioEnclosure: {
      url: 'https://media.example.org/easter.mp3',
      mimeType: 'audio/mpeg',
      bytes: 48_000_000,
      guid: 'crbc-easter-2026',
    },
  },
  serviceEvent: {
    _id: 'event',
    _type: 'serviceEvent',
    eventId: `ev_${ULID}`,
    mediaItem: {_type: 'reference', _ref: 'item'},
    scheduledStart: {
      local: '2026-04-05T09:00',
      timeZone: 'America/New_York',
      offset: '-04:00',
      utc: '2026-04-05T13:00:00Z',
    },
    expectedDurationMinutes: 80,
    resourceId: 'lr_main',
    cancelled: true,
    requestedDestinations: [
      {_key: 'd1', platform: 'youtube', accountLabel: 'CRBC YouTube', visibility: 'public'},
      {_key: 'd2', platform: 'facebook', accountLabel: 'CRBC Facebook', visibility: 'unlisted'},
    ],
    socialGoLiveLeadMinutes: 10,
    ...unique,
  },
  series: {
    _id: 'gospel',
    _type: 'series',
    seriesId: `se_${ULID}`,
    title: 'The Gospel of John',
    description: 'A year in John.',
    ordering: 'manual',
    manualOrder: [reference('m1', 'item')],
    ...unique,
  },
  speaker: {
    _id: 'pastor',
    _type: 'speaker',
    speakerId: `sp_${ULID}`,
    name: 'Sam Jones',
    aliases: ['Pastor Sam'],
    ...unique,
  },
  topic: {
    _id: 'grace',
    _type: 'topic',
    topicId: `tp_${ULID}`,
    label: 'Grace',
    aliases: ['Mercy'],
    ...unique,
  },
}

// The copy's fields, without the ones Sanity or the editorial ID set.
async function copyFields(type: EditorialType): Promise<Record<string, unknown>> {
  const studio = createHarness({documents: [originals[type]]})
  const copy: Record<string, unknown> = await studio.duplicate(originals[type]._id)
  for (const field of ['_id', '_rev', '_createdAt', '_updatedAt', ids[type].field]) {
    delete copy[field]
  }
  return copy
}

// Sanity's lists from /tmp/studio-spec/notes/01-sanity-research.md, question 1, without
// schedule. The fresh-ID Duplicate takes Sanity's action name, so it shows as duplicate in
// Sanity's place. Tasks and canvas actions stay.
const editorialActions = {
  draft: [
    'publish',
    'unpublish',
    'duplicate',
    'restore',
    'discardChanges',
    'TaskCreateAction',
    'linkToCanvas',
    'unlinkFromCanvas',
    'editInCanvas',
    'delete',
  ],
  published: [
    'unpublish',
    'publish',
    'duplicate',
    'restore',
    'discardChanges',
    'delete',
    'TaskCreateAction',
  ],
  version: [
    'duplicate',
    'unpublishVersion',
    'linkToCanvas',
    'unlinkFromCanvas',
    'editInCanvas',
    'discardVersion',
  ],
  // Sanity offers no Duplicate on a scheduled draft, so there's nothing to replace. Publish now
  // is gone too.
  'scheduled-draft': ['discardVersion'],
  revision: [
    'publish',
    'unpublish',
    'duplicate',
    'restore',
    'discardChanges',
    'delete',
    'TaskCreateAction',
  ],
}
const versionTypes = Object.keys(editorialActions) as (keyof typeof editorialActions)[]

// The resolver works by type name, so this holds for types other tickets haven't registered yet.
test("the editorial types swap Sanity's Duplicate for the fresh-ID one in every version type", () => {
  const studio = createHarness()
  for (const type of editorialTypes) {
    for (const versionType of versionTypes) {
      assert.deepEqual(
        studio.actions(type, versionType),
        editorialActions[versionType],
        `${type} ${versionType}`,
      )
      const duplicates = studio
        .actionDetails(type, versionType)
        .filter(({action}) => action === 'duplicate')
        .map(({component}) => component)
      const expected = versionType === 'scheduled-draft' ? [] : ['FreshIdDuplicateAction']
      assert.deepEqual(duplicates, expected, `${type} ${versionType}`)
    }
  }
})

// A scheduled draft is validated only when Schedule is clicked, and then publishes on the server
// without another check (/tmp/studio-spec/reviews/ids-fable-5.1.md, finding 2). Media items
// have their own publish time.
test('the editorial types offer no scheduling in any version type', () => {
  const studio = createHarness()
  for (const type of editorialTypes) {
    for (const versionType of versionTypes) {
      assert.ok(!studio.actions(type, versionType).includes('schedule'), `${type} ${versionType}`)
    }
  }
})

// On a scheduled draft, publish is Sanity's Publish now, which publishes without checking
// validation (/tmp/studio-spec/reviews/ids-fable-5.1-r2.md, finding 8). Delete stays, so an
// editor can still move a stray scheduled draft back to the draft.
test('a scheduled draft of an editorial type offers only Delete, not Publish now', () => {
  const studio = createHarness()
  for (const type of editorialTypes) {
    assert.deepEqual(studio.actions(type, 'scheduled-draft'), ['discardVersion'], type)
    assert.ok(studio.actions(type, 'draft').includes('publish'), type)
  }
})

test('on a document linked to Canvas, the fresh-ID Duplicate stays available', () => {
  const studio = createHarness()
  for (const type of editorialTypes) {
    for (const versionType of versionTypes.filter((name) => name !== 'scheduled-draft')) {
      const duplicate = studio
        .actionDetails(type, versionType)
        .find(({component}) => component === 'FreshIdDuplicateAction')
      assert.equal(duplicate?.keptWhenLinkedToCanvas, true, `${type} ${versionType}`)
    }
  }
  // The guard is live in the harness. It disables the unnamed task action.
  const task = studio
    .actionDetails('mediaItem', 'draft')
    .find(({component}) => component === 'TaskCreateAction')
  assert.equal(task?.keptWhenLinkedToCanvas, false)
})

test('a copy is an unpublished draft with a fresh ID of its kind, and the original is unchanged', async () => {
  for (const type of editorialTypes) {
    const original = originals[type]
    const {field, pattern} = ids[type]
    const studio = createHarness({documents: [original]})
    const copy = await studio.duplicate(original._id)
    assert.match(copy._id, /^drafts\.[0-9a-f-]{36}$/, type)
    assert.equal(copy._type, type)
    assert.match(String(copy[field]), pattern, type)
    assert.notEqual(copy[field], original[field], type)
    assert.deepEqual(
      studio.documents(),
      [copy, original].sort((a, b) => a._id.localeCompare(b._id)),
    )
  }
})

test('a copy drops the slug, the slug history and the import source', async () => {
  for (const type of editorialTypes) {
    const studio = createHarness({documents: [originals[type]]})
    const copy = await studio.duplicate(originals[type]._id)
    for (const field of ['slug', 'slugHistory', 'source']) {
      assert.equal(copy[field], undefined, `${type} ${field}`)
    }
  }
})

test('a media item copy also drops the podcast enclosure, whose GUID names the original episode', async () => {
  assert.deepEqual(await copyFields('mediaItem'), {
    _type: 'mediaItem',
    kind: 'sermon',
    title: 'Easter Sunday',
    serviceDate: '2026-04-05',
    serviceTimezone: 'America/New_York',
    speakers: [reference('s1', 'pastor')],
    series: [reference('r1', 'gospel')],
  })
})

test('a series copy also drops its manual order, because those items list the original', async () => {
  assert.deepEqual(await copyFields('series'), {
    _type: 'series',
    title: 'The Gospel of John',
    description: 'A year in John.',
    ordering: 'manual',
  })
})

test('a service event copy keeps its destinations and duration, and clears the item, the start and the cancellation', async () => {
  assert.deepEqual(await copyFields('serviceEvent'), {
    _type: 'serviceEvent',
    scheduledStart: {timeZone: 'America/New_York'},
    expectedDurationMinutes: 80,
    resourceId: 'lr_main',
    cancelled: false,
    requestedDestinations: originals.serviceEvent.requestedDestinations,
    socialGoLiveLeadMinutes: 10,
  })
})

test('a speaker or topic copy keeps everything else', async () => {
  assert.deepEqual(await copyFields('speaker'), {
    _type: 'speaker',
    name: 'Sam Jones',
    aliases: ['Pastor Sam'],
  })
  assert.deepEqual(await copyFields('topic'), {_type: 'topic', label: 'Grace', aliases: ['Mercy']})
})

test('with a release pinned, the copy is made from the release version and still goes to drafts', async () => {
  const item = originals.mediaItem
  const versions = [
    item,
    {...item, _id: 'drafts.item', title: 'Easter Sunday, draft'},
    {...item, _id: 'versions.rSpring.item', title: 'Easter Sunday, spring release'},
  ]
  const studio = createHarness({documents: versions})
  const copy = await studio.duplicate('item', {release: 'rSpring'})
  assert.match(copy._id, /^drafts\.[0-9a-f-]{36}$/)
  assert.notEqual(copy.contentId, item.contentId)
  assert.equal(copy.title, 'Easter Sunday, spring release')
  assert.deepEqual(
    studio.documents().filter(({_id}) => _id !== copy._id),
    [...versions].sort((a, b) => a._id.localeCompare(b._id)),
  )

  // A release with no version of the item shows the draft, so the copy is made from that.
  const fromDraft = await studio.duplicate('item', {release: 'rSummer'})
  assert.match(fromDraft._id, /^drafts\.[0-9a-f-]{36}$/)
  assert.equal(fromDraft.title, 'Easter Sunday, draft')
})

test("a media item's copy passes the ID rules next to its original", async () => {
  const studio = createHarness({documents: [originals.mediaItem]})
  const copy = await studio.duplicate('item')
  assert.deepEqual(errorsAt(await studio.validate(copy._id), 'contentId'), [])
})

// Studio's "Paste document" writes every field of the copied document, read-only ones included,
// so the content ID comes along (research question 4).
test("a whole-document paste of another item's fields keeps a published item's ID, and is caught on a new item", async () => {
  const other = {...originals.mediaItem, _id: 'other', contentId: `mi_${OTHER_ULID}`}
  const pasted = {
    set: Object.fromEntries(Object.entries(other).filter(([key]) => !key.startsWith('_'))),
  }
  const studio = createHarness({documents: [originals.mediaItem, other]})

  // In a published item's draft or release version, the form sets the published ID back.
  for (const release of [undefined, 'rSpring']) {
    const version = await studio.edit('item', pasted, {release})
    assert.equal(version.contentId, originals.mediaItem.contentId, version._id)
    assert.deepEqual(errorsAt(await studio.validate(version._id), 'contentId'), [], version._id)
  }

  // A new item has no ID to keep, so the ID rules catch the other item's.
  const created = await studio.create('mediaItem')
  const pastedNew = await studio.edit(created._id, pasted)
  assert.equal(pastedNew.contentId, other.contentId)
  assert.equal(errorsAt(await studio.validate(pastedNew._id), 'contentId').length, 1)
  await assert.rejects(studio.publish(pastedNew._id), /contentId/)
})

test("Duplicate leaves its source as it was, and the copy shares none of the source's objects or arrays", async () => {
  for (const type of editorialTypes) {
    const original = originals[type]
    const studio = createHarness({documents: [original]})
    await studio.duplicate(original._id)
    assert.deepEqual(
      studio.documents().find(({_id}) => _id === original._id),
      original,
      type,
    )
    assert.deepEqual(studio.sharedWithSource(), [], type)
  }
})
