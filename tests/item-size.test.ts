// The size check (contract section 10.2, spec proposal S3). Studio counts bytes with TextEncoder,
// because the contract's serializedBytes uses Node's Buffer, which the browser bundle lacks.
import assert from 'node:assert/strict'
import {readFileSync, readdirSync} from 'node:fs'
import {test} from 'node:test'
import {serializedBytes} from '../media-contract/src/size.ts'
import {serializedSize} from '../schemaTypes/media/bytes.ts'
import {createHarness, type Marker, type TestDocument} from './harness.ts'

const fixtures = new URL('../media-contract/fixtures/sanity/', import.meta.url)

test("Studio's byte count equals the contract's serializedBytes on the same values", () => {
  const values: unknown[] = [
    '',
    'Easter Sunday',
    // Two, three and four UTF-8 bytes per character.
    'é'.repeat(200),
    'あ'.repeat(200),
    '😀'.repeat(200),
    // Characters compact JSON escapes: a quote, a backslash, control characters and lone
    // surrogates, which JSON writes as \u escapes.
    '"\\\n\t\u0000\u001f',
    '\ud800 and \udfff',
    0,
    -0,
    1.5,
    1e21,
    Number.MAX_VALUE,
    true,
    null,
    [],
    {},
    {title: 'Grace 😀', speakers: [{id: 'sp_01K6Z8Y4N3QJ5W2X7R9T0V1B2C', name: 'Ann Lée'}]},
    ...readdirSync(fixtures).map((name) =>
      JSON.parse(readFileSync(new URL(name, fixtures), 'utf8')),
    ),
  ]
  for (const value of values) {
    assert.equal(serializedSize(value), serializedBytes(value), JSON.stringify(value))
  }
})

const errors = (markers: Marker[]) => markers.filter((marker) => marker.level === 'error')
const sizeErrors = (markers: Marker[]) => errors(markers).filter(({path}) => path === '')

// What each expanded value adds to the estimate, worked out from the contract's JSON Schema. The
// longest label is 200 code points that compact JSON writes as six-byte escapes such as \u0000,
// 1,202 bytes with its quotes. The longest number JSON writes is Number.MAX_VALUE,
// 1.7976931348623157e+308, 23 bytes. A URL is ASCII, so the longest is 2,050 bytes with quotes.
const allowance = {
  // {"id":"sp_<26>","name":<1,202>} is 1+4+1+31+1+6+1+1,202+1, and a comma before the next.
  speaker: 1249,
  // The same with "label", one byte longer than "name".
  topic: 1250,
  // {"id":"se_<26>","title":<1,202>,"position":<23>} is 1,284, and a comma.
  series: 1285,
  // {"url":<2,050>,"width":<23>,"height":<23>,"alt":<1,202>,"lqip":<12,290>} is 15,630. lqip
  // holds up to 2,048 code points of any text, at six bytes each.
  image: 15630,
  // {"url":<2,050>,"mimeType":<602>} is 2,672, and a comma. The label is stored on the item.
  document: 2673,
  // Every ItemDetail property name, null unless the website computes its value: canonicalUrl,
  // publishedAt, revision, durationSeconds, seriesTitle, availability and audio.durationSeconds.
  computed: 3794,
}

// Studio's estimate, worked out the contract's way: the stored item through serializedBytes, plus
// the allowances.
function expectedEstimate(document: TestDocument): number {
  const count = (field: string) => ((document[field] as unknown[] | undefined) ?? []).length
  const artwork = (document.artwork ?? {}) as Record<string, unknown>
  const images = ['thumbnail', 'banner'].filter((image) => artwork[image]).length
  return (
    serializedBytes(document) +
    count('speakers') * allowance.speaker +
    count('topics') * allowance.topic +
    count('series') * allowance.series +
    images * allowance.image +
    count('documents') * allowance.document +
    allowance.computed
  )
}

// The estimate the size error reports, or undefined when there's no size error.
function reportedEstimate(markers: Marker[]): number | undefined {
  const [error] = sizeErrors(markers)
  const match = error && /estimates ([\d,]+) bytes/.exec(error.message)
  return match ? Number(match[1].replaceAll(',', '')) : undefined
}

const ULID = '01K6Z8Y4N3QJ5W2X7R9T0V1B2C'
const reference = (_key: string, _ref: string) => ({_key, _type: 'reference', _ref})
// The longest label: 200 code points of four-byte emoji, with a digit to keep each one apart.
const label = (index: number) => `${index % 10}${'😀'.repeat(199)}`
const imageAsset: TestDocument = {
  _id: `image-${'5e1f'.repeat(10)}-1920x1080-jpg`,
  _type: 'sanity.imageAsset',
}
const fileAsset: TestDocument = {_id: `file-${'7c2a'.repeat(10)}-pdf`, _type: 'sanity.fileAsset'}
const picture = {_type: 'image', asset: {_type: 'reference', _ref: imageAsset._id}, alt: label(0)}
const url = `https://example.org/${'a'.repeat(2028)}`

// Every speaker, topic and series an item can list, published, so its references hold.
const referenced: TestDocument[] = [
  ...Array.from({length: 10}, (_, i) => ({_id: `speaker${i}`, _type: 'speaker'})),
  ...Array.from({length: 20}, (_, i) => ({_id: `topic${i}`, _type: 'topic'})),
  ...Array.from({length: 10}, (_, i) => ({_id: `series${i}`, _type: 'series'})),
]

// An item at every field limit of contract section 10.2: the longest title, description, labels
// and URLs, and the most speakers, topics, series, passages and documents.
const fullItem = (): TestDocument => ({
  _id: 'item',
  _type: 'mediaItem',
  contentId: `mi_${ULID}`,
  kind: 'sermon',
  title: label(0),
  slug: {_type: 'slug', current: 'a'.repeat(200)},
  description: '😀'.repeat(5000),
  serviceDate: '2026-04-05',
  serviceTimezone: 'America/New_York',
  series: Array.from({length: 10}, (_, i) => reference(`r${i}`, `series${i}`)),
  speakers: Array.from({length: 10}, (_, i) => reference(`s${i}`, `speaker${i}`)),
  topics: Array.from({length: 20}, (_, i) => reference(`t${i}`, `topic${i}`)),
  passages: Array.from({length: 20}, (_, i) => ({
    _key: `p${i}`,
    _type: 'passage',
    book: 'Jas',
    chapterStart: 1,
    display: label(i),
  })),
  artwork: {thumbnail: picture, banner: picture},
  documents: Array.from({length: 50}, (_, i) => ({
    _key: `d${i}`,
    _type: 'mediaDocument',
    label: label(i),
    file: {_type: 'file', asset: {_type: 'reference', _ref: fileAsset._id}},
  })),
  audioEnclosure: {url, mimeType: 'audio/mpeg', bytes: 48_000_000, guid: label(0)},
  publicationPolicy: 'auto',
  source: {sourceId: label(0), sourceUrl: url, originalPublishedAt: '2024-03-31T13:00:00Z'},
})

const harness = () => createHarness({documents: [...referenced, imageAsset, fileAsset]})

test('an item within every field limit that still passes 200,000 bytes is an error', async () => {
  const studio = harness()
  const item = fullItem()
  const markers = await studio.validate(item)
  // The size rule's error, at the document, is the only one.
  assert.deepEqual(
    errors(markers).map(({path}) => path),
    [''],
  )
  assert.match(sizeErrors(markers)[0].message, /^This item is too large for the website and apps\./)
  assert.equal(reportedEstimate(markers), expectedEstimate(item))
})

test('the estimate adds a fixed allowance for each speaker, topic, series, image and document', async () => {
  const studio = harness()
  // One fewer of each than the limit, so one more of any still fits its field limit.
  const full = fullItem()
  const base: TestDocument = {
    ...full,
    speakers: (full.speakers as unknown[]).slice(1),
    topics: (full.topics as unknown[]).slice(1),
    series: (full.series as unknown[]).slice(1),
    artwork: {thumbnail: picture},
    documents: (full.documents as unknown[]).slice(1),
  }
  const added: Record<string, [TestDocument, number]> = {
    speaker: [{...base, speakers: full.speakers}, allowance.speaker],
    topic: [{...base, topics: full.topics}, allowance.topic],
    series: [{...base, series: full.series}, allowance.series],
    image: [{...base, artwork: full.artwork}, allowance.image],
    document: [{...base, documents: full.documents}, allowance.document],
  }
  const baseEstimate = reportedEstimate(await studio.validate(base))
  assert.equal(baseEstimate, expectedEstimate(base))
  for (const [name, [withOneMore, perValue]] of Object.entries(added)) {
    const estimate = reportedEstimate(await studio.validate(withOneMore))
    const storedGrowth = serializedBytes(withOneMore) - serializedBytes(base)
    assert.equal(estimate! - baseEstimate! - storedGrowth, perValue, name)
  }
})

// The same item with the description that brings its estimate to exactly bytes.
function itemEstimatedAt(bytes: number, item: TestDocument): TestDocument {
  const need = bytes - expectedEstimate({...item, description: ''})
  // Four-byte emoji, then plain letters for what's left. Neither needs a JSON escape.
  const description = '😀'.repeat(Math.floor(need / 4)) + 'a'.repeat(need % 4)
  assert.ok(need >= 0 && [...description].length <= 5000, `${need} bytes don't fit`)
  const sized = {...item, description}
  assert.equal(expectedEstimate(sized), bytes)
  return sized
}

test('an item estimated at 200,000 bytes passes, and one byte more is an error', async () => {
  const studio = harness()
  const full = fullItem()
  // The most documents that leave room for a description, which then brings the estimate to the
  // cap. Every field stays within its limit.
  const withDocuments = (count: number) => ({
    ...full,
    documents: (full.documents as unknown[]).slice(0, count),
  })
  let count = 50
  while (expectedEstimate({...withDocuments(count), description: ''}) > 200_000) count--
  const item = withDocuments(count)

  const atCap = await studio.validate(itemEstimatedAt(200_000, item))
  assert.deepEqual(errors(atCap), [])

  const overCap = await studio.validate(itemEstimatedAt(200_001, item))
  assert.deepEqual(
    errors(overCap).map(({path}) => path),
    [''],
  )
  assert.equal(reportedEstimate(overCap), 200_001)
})
