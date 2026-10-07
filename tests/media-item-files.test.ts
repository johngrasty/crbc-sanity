import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker, type TestDocument} from './harness.ts'

const ULID = '01K6Z8Y4N3QJ5W2X7R9T0V1B2C'
const OTHER_ULID = '01K6Z9A7H2MXW4Q8C5R3T6V0BD'

const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)
const errors = (markers: Marker[]) => markers.filter((marker) => marker.level === 'error')

const item = (fields: Record<string, unknown> = {}): TestDocument => ({
  _id: 'item',
  _type: 'mediaItem',
  contentId: `mi_${ULID}`,
  kind: 'sermon',
  serviceTimezone: 'America/New_York',
  publicationPolicy: 'manual',
  ...fields,
})

// What the importer writes (contract sections 2 and 3).
const source = {
  sourceId: 'subsplash:mi:+abc123',
  sourceUrl: 'https://subsplash.com/crbc/media/mi/+abc123',
  originalPublishedAt: '2024-03-31T13:00:00Z',
}

test('an imported media item keeps where it came from', async () => {
  const studio = createHarness()
  assert.deepEqual(errors(await studio.validate(item({source}))), [])
})

test('a source ID another media item uses is an error, in any of its versions', async () => {
  for (const other of ['other', 'drafts.other', 'versions.rSpring.other']) {
    const studio = createHarness({
      documents: [{...item({source}), _id: other, contentId: `mi_${OTHER_ULID}`}],
    })
    const markers = await studio.validate(item({source}))
    assert.equal(errorsAt(markers, 'source.sourceId').length, 1, `taken by ${other}`)
  }
})

test("an item's own versions and other types may share its source ID", async () => {
  const studio = createHarness({
    documents: [
      item({source}),
      {...item({source}), _id: 'versions.rSpring.item'},
      {_id: 'gospel', _type: 'series', source},
    ],
  })
  const draft = await studio.edit('item', {set: {title: 'Easter'}})
  for (const _id of [draft._id, 'item', 'versions.rSpring.item']) {
    assert.deepEqual(errorsAt(await studio.validate(_id), 'source.sourceId'), [], _id)
  }
})

// An uploaded PDF. The asset document must exist, as it does once Studio uploads the file.
const fileAsset: TestDocument = {
  _id: `file-${'7c2a'.repeat(10)}-pdf`,
  _type: 'sanity.fileAsset',
}
const documentsOf = (count: number) =>
  Array.from({length: count}, (_, index) => ({
    _key: `d${index}`,
    _type: 'mediaDocument',
    label: `Sermon notes ${index + 1}`,
    file: {_type: 'file', asset: {_type: 'reference', _ref: fileAsset._id}},
  }))

test('an item holds up to 50 documents, each with a label and a file', async () => {
  const studio = createHarness({documents: [fileAsset]})
  assert.deepEqual(errors(await studio.validate(item({documents: documentsOf(50)}))), [])
  assert.deepEqual(
    errorsAt(await studio.validate(item({documents: documentsOf(51)})), 'documents'),
    [{path: 'documents', level: 'error', message: 'Use 50 documents or fewer. This has 51.'}],
  )
})

test('a document without a label or a file is an error', async () => {
  const studio = createHarness({documents: [fileAsset]})
  const [document] = documentsOf(1)
  for (const field of ['label', 'file']) {
    const markers = await studio.validate(item({documents: [{...document, [field]: undefined}]}))
    assert.equal(errorsAt(markers, `documents[_key=="d0"].${field}`).length, 1, field)
    assert.equal(errors(markers).length, 1, field)
  }
  const empty = await studio.validate(item({documents: [{...document, label: ''}]}))
  assert.equal(errorsAt(empty, 'documents[_key=="d0"].label').length, 1)
})

test('a document label holds up to 200 characters, counted as code points', async () => {
  const studio = createHarness({documents: [fileAsset]})
  const [document] = documentsOf(1)
  for (const character of ['é', '😀']) {
    const atLimit = item({documents: [{...document, label: character.repeat(200)}]})
    assert.deepEqual(errors(await studio.validate(atLimit)), [], `200 × ${character}`)
    const pastLimit = item({documents: [{...document, label: character.repeat(201)}]})
    assert.deepEqual(
      errorsAt(await studio.validate(pastLimit), 'documents[_key=="d0"].label'),
      [
        {
          path: 'documents[_key=="d0"].label',
          level: 'error',
          message: 'Use 200 characters or fewer. This has 201.',
        },
      ],
      `201 × ${character}`,
    )
  }
})

const warningsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'warning' && marker.path === path)

// A podcast episode's audio file, as podcast apps read it from the feed.
const audioEnclosure = {
  url: 'https://media.example.org/easter.mp3',
  mimeType: 'audio/mpeg',
  bytes: 48_000_000,
  guid: 'crbc-easter-2026',
}

test('podcast audio is optional, but once an item has it, it needs all four fields', async () => {
  const studio = createHarness()
  assert.deepEqual(errors(await studio.validate(item())), [])
  assert.deepEqual(errors(await studio.validate(item({audioEnclosure}))), [])
  for (const field of ['url', 'mimeType', 'bytes', 'guid']) {
    const markers = await studio.validate(
      item({audioEnclosure: {...audioEnclosure, [field]: undefined}}),
    )
    assert.equal(errorsAt(markers, `audioEnclosure.${field}`).length, 1, field)
    assert.equal(errors(markers).length, 1, field)
  }
})

test('the podcast audio format is audio/mpeg, audio/mp4 or audio/aac', async () => {
  const studio = createHarness()
  for (const mimeType of ['audio/mpeg', 'audio/mp4', 'audio/aac']) {
    const markers = await studio.validate(item({audioEnclosure: {...audioEnclosure, mimeType}}))
    assert.deepEqual(errors(markers), [], mimeType)
  }
  for (const mimeType of ['audio/wav', 'video/mp4', 'mp3']) {
    const markers = await studio.validate(item({audioEnclosure: {...audioEnclosure, mimeType}}))
    assert.equal(errorsAt(markers, 'audioEnclosure.mimeType').length, 1, mimeType)
  }
})

test('the podcast audio size is a positive whole number of bytes', async () => {
  const studio = createHarness()
  for (const bytes of [1, 48_000_000]) {
    const markers = await studio.validate(item({audioEnclosure: {...audioEnclosure, bytes}}))
    assert.deepEqual(errors(markers), [], String(bytes))
  }
  for (const bytes of [0, -1, 1.5]) {
    const markers = await studio.validate(item({audioEnclosure: {...audioEnclosure, bytes}}))
    assert.equal(errorsAt(markers, 'audioEnclosure.bytes').length, 1, String(bytes))
  }
})

test('a podcast GUID another media item uses is an error, in any of its versions', async () => {
  for (const other of ['other', 'drafts.other', 'versions.rSpring.other']) {
    const studio = createHarness({
      documents: [{...item({audioEnclosure}), _id: other, contentId: `mi_${OTHER_ULID}`}],
    })
    const created = await studio.create('mediaItem')
    const edited = await studio.edit(created._id, {set: {audioEnclosure}})
    const markers = await studio.validate(edited._id)
    assert.equal(errorsAt(markers, 'audioEnclosure.guid').length, 1, `taken by ${other}`)
  }
})

test("an item's own versions may share its podcast GUID", async () => {
  const studio = createHarness({
    documents: [item({audioEnclosure}), {...item({audioEnclosure}), _id: 'versions.rSpring.item'}],
  })
  const draft = await studio.edit('item', {set: {title: 'Easter'}})
  for (const _id of [draft._id, 'item', 'versions.rSpring.item']) {
    assert.deepEqual(errorsAt(await studio.validate(_id), 'audioEnclosure.guid'), [], _id)
  }
})

test("changing a published item's podcast GUID is a warning, in a draft or a release version", async () => {
  for (const release of [undefined, 'rSpring']) {
    const studio = createHarness({documents: [item({audioEnclosure})]})
    const unchanged = await studio.edit('item', {set: {title: 'Easter'}}, {release})
    assert.deepEqual(warningsAt(await studio.validate(unchanged._id), 'audioEnclosure.guid'), [])
    const changed = await studio.edit(
      'item',
      {set: {'audioEnclosure.guid': 'crbc-easter-2026-v2'}},
      {release},
    )
    const markers = await studio.validate(changed._id)
    assert.equal(warningsAt(markers, 'audioEnclosure.guid').length, 1, changed._id)
    assert.deepEqual(errors(markers), [], changed._id)
  }
})

test('a GUID on an item that was never published, or published without audio, is no warning', async () => {
  const studio = createHarness({documents: [{...item({audioEnclosure}), _id: 'drafts.item'}]})
  assert.deepEqual(warningsAt(await studio.validate('drafts.item'), 'audioEnclosure.guid'), [])

  const withoutAudio = createHarness({documents: [item()]})
  const draft = await withoutAudio.edit('item', {set: {audioEnclosure}})
  assert.deepEqual(warningsAt(await withoutAudio.validate(draft._id), 'audioEnclosure.guid'), [])
})

// Sanity names an image asset by its hash, its width and height, and its format.
const imageAsset = (width: number, height: number): TestDocument => ({
  _id: `image-${'5e1f'.repeat(10)}-${width}x${height}-jpg`,
  _type: 'sanity.imageAsset',
})
const picture = (asset: TestDocument, fields: Record<string, unknown> = {}) => ({
  _type: 'image',
  asset: {_type: 'reference', _ref: asset._id},
  ...fields,
})

test("a media item's thumbnail and banner have alt text, and a thumbnail that isn't 16:9 is a warning", async () => {
  const widescreen = imageAsset(1920, 1080)
  const square = imageAsset(1200, 1200)
  const wide = imageAsset(3000, 1000)
  const studio = createHarness({documents: [widescreen, square, wide]})
  const artworkMarkers = async (artwork: Record<string, unknown>) =>
    (await studio.validate(item({artwork}))).filter(({path}) => path.startsWith('artwork'))

  const alt = 'The pulpit at sunrise'
  assert.deepEqual(
    await artworkMarkers({thumbnail: picture(widescreen, {alt}), banner: picture(wide, {alt})}),
    [],
  )
  assert.deepEqual(
    (await artworkMarkers({thumbnail: picture(square)})).map(({path, level}) => [path, level]),
    [['artwork.thumbnail', 'warning']],
  )
  for (const image of ['thumbnail', 'banner']) {
    const asset = image === 'thumbnail' ? widescreen : wide
    const markers = await artworkMarkers({[image]: picture(asset, {alt: '😀'.repeat(201)})})
    assert.deepEqual(errorsAt(markers, `artwork.${image}.alt`).length, 1, image)
  }
})

test("a media item's artwork, documents and podcast audio sit under Artwork and files, and its import source under Source", async () => {
  const studio = createHarness()
  const groups = studio.groups('mediaItem')
  assert.deepEqual(
    groups.map(({name}) => name),
    ['details', 'peopleAndScripture', 'artwork', 'publishing', 'source'],
  )
  const group = (name: string) => groups.find((candidate) => candidate.name === name)
  assert.equal(group('artwork')?.title, 'Artwork and files')
  assert.deepEqual(group('artwork')?.fields, ['artwork', 'documents', 'audioEnclosure'])
  assert.equal(group('source')?.title, 'Source')
  assert.deepEqual(group('source')?.fields, ['source'])
})
