import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type TestDocument} from './harness.ts'

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
const reference = (_key: string, _ref: string) => ({_key, _type: 'reference', _ref})

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

// Sanity's lists from /tmp/studio-spec/notes/01-sanity-research.md, question 1, with the
// fresh-ID Duplicate where Sanity's Duplicate was. Tasks and canvas actions stay.
const editorialActions = {
  draft: [
    'publish',
    'schedule',
    'unpublish',
    'FreshIdDuplicateAction',
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
    'FreshIdDuplicateAction',
    'restore',
    'discardChanges',
    'delete',
    'TaskCreateAction',
  ],
  version: [
    'FreshIdDuplicateAction',
    'unpublishVersion',
    'linkToCanvas',
    'unlinkFromCanvas',
    'editInCanvas',
    'discardVersion',
  ],
  // Sanity offers no Duplicate on a scheduled draft, so there's nothing to replace.
  'scheduled-draft': ['publish', 'schedule', 'discardVersion'],
  revision: [
    'publish',
    'schedule',
    'unpublish',
    'FreshIdDuplicateAction',
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
    }
  }
})

test('a copy is a new draft with a fresh ID of its kind, and nothing else changes', async () => {
  for (const type of editorialTypes) {
    const original = originals[type]
    const {field, pattern} = ids[type]
    const studio = createHarness({documents: [original]})
    const copy = await studio.duplicate(original._id)
    assert.match(copy._id, /^drafts\.[0-9a-f-]{36}$/, type)
    assert.equal(copy._type, type)
    assert.match(String(copy[field]), pattern, type)
    assert.notEqual(copy[field], original[field], type)
    // The copy isn't published, and the original is as it was.
    assert.deepEqual(
      studio.documents(),
      [copy, original].sort((a, b) => a._id.localeCompare(b._id)),
    )
  }
})
