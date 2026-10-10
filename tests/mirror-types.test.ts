// The mirror read types in mirror.types.ts, generated from the contract copy's JSON Schema. The
// typed samples below are compile-time tests: npm run check fails if a contract value doesn't
// fit the read types, or if a @ts-expect-error line stops being an error.
import assert from 'node:assert/strict'
import {readFileSync, readdirSync} from 'node:fs'
import {join} from 'node:path'
import {test} from 'node:test'
import {fileURLToPath} from 'node:url'
import contract from '../media-contract/schemas/media-v1.schema.json' with {type: 'json'}
import type {LiveStatusDocument, MediaReleaseDocument} from '../mirror.types'
import {mirrorTypes, mirrorTypesFile} from '../scripts/mirror-types.ts'

const fixturesDir = fileURLToPath(new URL('../media-contract/fixtures/sanity/', import.meta.url))
const fixture = (name: string) => JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'))

// Every contract fixture, typed. A tombstone for an absent source carries each nullable release
// field as null, and an idle live status each nullable live status field.
const releases: Record<string, MediaReleaseDocument> = {
  'media-release-absent-source.json': {
    _id: 'mediaRelease.production.mi_01J9SYNTH0000Z00000000000Z',
    _type: 'mediaRelease',
    environment: 'production',
    contentId: 'mi_01J9SYNTH0000Z00000000000Z',
    kind: null,
    public: false,
    assetId: null,
    playbackId: null,
    durationSeconds: null,
    captions: [],
    publishedAt: null,
    releaseVersion: null,
    mirrorGen: 2,
    mirrorSeq: 5001,
  },
  'media-release-public.json': {
    _id: 'mediaRelease.production.mi_01J9SYNTH0000Z00000000000M',
    _type: 'mediaRelease',
    environment: 'production',
    contentId: 'mi_01J9SYNTH0000Z00000000000M',
    kind: 'video',
    public: true,
    assetId: 'as_01J9SYNTH0000Z00000000000M',
    playbackId: 'synthVodPlaybackId0020',
    durationSeconds: 4680,
    captions: [
      {_key: 'en', language: 'en', label: 'English', kind: 'generated', state: 'available'},
    ],
    publishedAt: '2026-09-27T16:30:00Z',
    releaseVersion: 4,
    mirrorGen: 1,
    mirrorSeq: 1042,
  },
  'media-release-tombstone.json': {
    _id: 'mediaRelease.production.mi_01J9SYNTH0000Z00000000000Y',
    _type: 'mediaRelease',
    environment: 'production',
    contentId: 'mi_01J9SYNTH0000Z00000000000Y',
    kind: 'video',
    public: false,
    assetId: null,
    playbackId: null,
    durationSeconds: null,
    captions: [],
    publishedAt: '2026-08-02T16:30:00Z',
    releaseVersion: 7,
    mirrorGen: 1,
    mirrorSeq: 1101,
  },
}

const liveEvent = {
  eventId: 'ev_01J9SYNTH0000Z000000000001',
  contentId: 'mi_01J9SYNTH0000Z000000000034',
  title: 'Synthetic Sunday Service',
  scheduledStart: '2026-10-11T13:00:00Z',
  seriesTitle: 'Faith That Works',
}

const liveStatuses: Record<string, LiveStatusDocument> = {
  'live-status-absent-source.json': {
    _id: 'liveStatus.staging.main',
    _type: 'liveStatus',
    environment: 'staging',
    channel: 'main',
    resourceId: null,
    sessionState: null,
    takenDown: false,
    playableFrom: null,
    endedAt: null,
    event: null,
    nextEvent: null,
    playback: null,
    observedAt: null,
    staleAfterSeconds: 2700,
    mirrorGen: 1,
    mirrorSeq: 1,
  },
  'live-status-live.json': {
    _id: 'liveStatus.production.main',
    _type: 'liveStatus',
    environment: 'production',
    channel: 'main',
    resourceId: 'lr_main',
    sessionState: 'live',
    takenDown: false,
    playableFrom: '2026-10-11T12:40:00Z',
    endedAt: null,
    event: liveEvent,
    nextEvent: liveEvent,
    playback: {
      hls: 'https://stream.mux.com/synthLivePlaybackId0001.m3u8?token=SYNTHETIC-TOKEN',
      hlsRoku: 'https://stream.mux.com/synthLivePlaybackId0001.m3u8?token=SYNTHETIC-TOKEN',
      expiresAt: '2026-10-11T19:00:00Z',
    },
    observedAt: '2026-10-11T12:59:00Z',
    staleAfterSeconds: 180,
    mirrorGen: 1,
    mirrorSeq: 1200,
  },
}

// No fixture has an event without a series, so this sample adds one.
const withoutSeries: LiveStatusDocument = {
  ...liveStatuses['live-status-live.json'],
  event: {...liveEvent, seriesTitle: null},
  nextEvent: {...liveEvent, seriesTitle: null},
}

// What the read types refuse. Each line must stay a type error.
export const refused: (MediaReleaseDocument | LiveStatusDocument)[] = [
  // @ts-expect-error public is never null.
  {...releases['media-release-public.json'], public: null},
  // @ts-expect-error environment is never null.
  {...releases['media-release-public.json'], environment: null},
  // @ts-expect-error kind is video, nonvideo or null.
  {...releases['media-release-public.json'], kind: 'audio'},
  {
    ...releases['media-release-public.json'],
    // @ts-expect-error a caption's label is never null.
    captions: [{language: 'en', label: null, kind: 'generated', state: 'available'}],
  },
  // @ts-expect-error takenDown is never null.
  {...liveStatuses['live-status-live.json'], takenDown: null},
  // @ts-expect-error staleAfterSeconds is 180 or 2700.
  {...liveStatuses['live-status-live.json'], staleAfterSeconds: 60},
  // @ts-expect-error sessionState has no paused.
  {...liveStatuses['live-status-live.json'], sessionState: 'paused'},
]

// media-ops writes every field, so the read types require each field the contract requires,
// null or not. Sanity's system fields other than _id and _type are optional, as in the contract.
type IsRequired<T, K extends keyof T> = object extends Pick<T, K> ? false : true
export const required: [
  IsRequired<MediaReleaseDocument, 'captions'>,
  IsRequired<MediaReleaseDocument, 'kind'>,
  IsRequired<LiveStatusDocument, 'playback'>,
  IsRequired<NonNullable<LiveStatusDocument['event']>, 'seriesTitle'>,
  IsRequired<LiveStatusDocument, '_id'>,
] = [true, true, true, true, true]
export const optional: [
  IsRequired<MediaReleaseDocument, '_rev'>,
  IsRequired<LiveStatusDocument, '_updatedAt'>,
] = [false, false]

// A reader has to handle null, not just a missing field.
export const describeKind = (release: MediaReleaseDocument) =>
  // @ts-expect-error kind can be null on a tombstone for an absent source.
  release.kind !== undefined ? release.kind.toUpperCase() : 'unknown'
export const describeKindSafely = (release: MediaReleaseDocument) =>
  release.kind === null ? 'unknown' : release.kind.toUpperCase()

test('the mirror read types are what the contract copy generates', async () => {
  const committed = readFileSync(mirrorTypesFile, 'utf8')
  assert.equal(await mirrorTypes(), committed, 'Run npm run typegen to regenerate mirror.types.ts')
})

test('each typed sample is the contract fixture it copies', () => {
  const typed: Record<string, unknown> = {...releases, ...liveStatuses}
  const names = readdirSync(fixturesDir).filter((name) => name.endsWith('.json'))
  assert.deepEqual(Object.keys(typed).sort(), names.sort())
  for (const name of names) assert.deepEqual(typed[name], fixture(name), name)
})

// Every field path whose JSON Schema allows null, such as kind or event.seriesTitle.
type JsonSchema = {
  $ref?: string
  type?: string | string[]
  enum?: unknown[]
  properties?: Record<string, JsonSchema>
  allOf?: JsonSchema[]
  oneOf?: JsonSchema[]
}
const definitions = contract.$defs as Record<string, JsonSchema>
function nullablePaths(schema: JsonSchema, prefix = '', found = new Set<string>()) {
  const resolved = schema.$ref ? definitions[schema.$ref.replace('#/$defs/', '')] : undefined
  const branches = [
    ...(schema.allOf ?? []),
    ...(schema.oneOf ?? []),
    ...(resolved ? [resolved] : []),
  ]
  const allowsNull =
    [schema.type].flat().includes('null') ||
    schema.enum?.includes(null) ||
    schema.oneOf?.some(({type}) => type === 'null')
  if (prefix && allowsNull) found.add(prefix)
  for (const branch of branches) nullablePaths(branch, prefix, found)
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    nullablePaths(property, prefix ? `${prefix}.${name}` : name, found)
  }
  return found
}

const valueAt = (document: object, path: string) =>
  path
    .split('.')
    .reduce<unknown>((value, key) => (value as Record<string, unknown>)?.[key], document)

test('the typed samples hold null in every field the contract lets be null', () => {
  for (const [definition, samples] of [
    ['SanityMediaRelease', Object.values(releases)],
    ['SanityLiveStatus', [...Object.values(liveStatuses), withoutSeries]],
  ] as const) {
    const paths = [...nullablePaths(definitions[definition])]
    assert.ok(paths.length >= 6, definition)
    for (const path of paths) {
      const sample = samples.find((candidate) => valueAt(candidate, path) === null)
      assert.ok(sample, `${definition} has no typed sample with ${path} null`)
    }
  }
})
