// The archive importer's drafts against Studio (subsplash-replacement, archive import v2, piece
// 8, section 10.1). media-ops' draft writer writes these documents through the API, so Studio's
// own rules never run on them before an editor opens them. The fixtures in
// tests/fixtures/import-drafts are the writer's output, byte for byte, from media-ops'
// test/fixtures/draft-writer, and the SHA-256 of each is pinned on both sides, so a change to
// either shows here. This test loads them into the harness and checks what Studio does with
// them: the series and speaker drafts validate, the item draft's only errors are its weak
// references to unpublished targets, and once John publishes the series and the speaker, the
// item validates and publishes with its references made strong.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import {referenceText} from '../schemaTypes/media/passage'
import {createHarness, type Marker, type TestDocument} from './harness.ts'

const FIXTURES: Record<string, string> = {
  'item.json': '4b021f8e06d419874b642b62c0df43d78ffc68cd65ed29320b95fcac789e4170',
  'item-with-assets.json': 'fb120c667ed750f941015da2bdb1052bbcf5d18c974f3605ad6ca732b9122291',
  'passages.json': '5e1e3ecbfc799519335421ba516ecb92edc6951282d8b771bc30b812361376ec',
  'passages-refused.json': 'df1b501273e0f7947a7deef593c88dc9a64872676bdf9f84e7c174f2311f9ed0',
  'series.json': '87832bf116108b3bd1f22f6fdea6013df1fec7e4655415090d0df14f52e6e2e6',
  'speaker.json': '8ec20758c2fb7dd53dd2e7e2c5687b9ef53e7f766fee06a60a03a8a1bd666b34',
  'topic.json': 'b5648ba3af8eb7990b9ff3ef127adabf196e4e6ec87c7ad7a4892ddf0f23244f',
  'item-with-topic.json': 'f69a39b5e12766b8309c898908549ee1acecc94c92f82be37a1137f188135791',
}

const bytesOf = (name: string) =>
  readFileSync(new URL(`fixtures/import-drafts/${name}`, import.meta.url))
const fixture = (name: string) => JSON.parse(bytesOf(name).toString('utf8'))

const ITEM: TestDocument = fixture('item.json')
const ITEM_WITH_ASSETS: TestDocument = fixture('item-with-assets.json')
const SERIES: TestDocument = fixture('series.json')
const SPEAKER: TestDocument = fixture('speaker.json')
const TOPIC: TestDocument = fixture('topic.json')
const ITEM_WITH_TOPIC: TestDocument = fixture('item-with-topic.json')
const publishedIdOf = (doc: TestDocument) => doc._id.replace(/^drafts\./, '')

const errors = (markers: Marker[]) => markers.filter(({level}) => level === 'error')

// The asset documents the item's artwork and documents name. Content Lake has them before the
// asset step's patch, and refuses a strong reference to a document that doesn't exist.
function assetsOf(item: TestDocument): TestDocument[] {
  const refs = [
    (item.artwork as {thumbnail: {asset: {_ref: string}}}).thumbnail.asset._ref,
    ...(item.documents as {file: {asset: {_ref: string}}}[]).map(({file}) => file.asset._ref),
  ]
  return refs.map((_id) => ({
    _id,
    _type: _id.startsWith('image-') ? 'sanity.imageAsset' : 'sanity.fileAsset',
  }))
}

test("the fixtures are the draft writer's output, by their SHA-256", () => {
  for (const [name, sha256] of Object.entries(FIXTURES)) {
    assert.equal(createHash('sha256').update(bytesOf(name)).digest('hex'), sha256, name)
  }
})

test('the series and speaker drafts validate with no error', async () => {
  const studio = createHarness({documents: [SERIES, SPEAKER]})
  assert.deepEqual(errors(await studio.validate(SERIES._id)), [])
  assert.deepEqual(errors(await studio.validate(SPEAKER._id)), [])
})

for (const [name, item] of [
  ['item', ITEM],
  ['item after the asset step', ITEM_WITH_ASSETS],
] as const) {
  test(`the ${name} draft: its only errors are its weak references, until the series and speaker publish`, async () => {
    const extra = 'artwork' in item ? assetsOf(item) : []
    const studio = createHarness({documents: [SERIES, SPEAKER, item, ...extra]})
    const before = errors(await studio.validate(item._id))
    assert.deepEqual(
      before.map(({path, message}) => [path.replace(/\[.*$/, ''), message]).sort(),
      [
        ['series', 'Referenced document must be published'],
        ['speakers', 'Referenced document must be published'],
      ],
      JSON.stringify(before),
    )
    await assert.rejects(
      studio.publish(publishedIdOf(item)),
      /Referenced document must be published/,
    )

    await studio.publish(publishedIdOf(SERIES))
    await studio.publish(publishedIdOf(SPEAKER))
    assert.deepEqual(errors(await studio.validate(item._id)), [])
    const published = await studio.publish(publishedIdOf(item))
    for (const field of ['series', 'speakers']) {
      for (const ref of published[field] as Record<string, unknown>[]) {
        assert.ok(!('_weak' in ref), `${field}: _weak`)
        assert.ok(!('_strengthenOnPublish' in ref), `${field}: _strengthenOnPublish`)
      }
    }
  })
}

test("E85's holder rule runs on the item's source aliases", async () => {
  // Another media item that already holds the item's alias as its own source ID. Studio
  // marks the alias, so a twin can't publish. With no such holder the alias passes, as above.
  const [alias] = (ITEM.source as {aliases: string[]}).aliases
  const holder: TestDocument = {
    _id: 'other-item',
    _type: 'mediaItem',
    contentId: 'mi_01K6Z8Y4N3QJ5W2X7R9T0V1B2C',
    kind: 'service',
    serviceTimezone: 'America/New_York',
    publicationPolicy: 'manual',
    source: {sourceId: alias},
  }
  const studio = createHarness({documents: [SERIES, SPEAKER, ITEM, holder]})
  const markers = errors(await studio.validate(ITEM._id)).filter(({path}) =>
    path.startsWith('source'),
  )
  assert.deepEqual(
    markers.map(({path, message}) => [path, message]),
    [
      [
        'source.aliases[0]',
        'The media item other-item already uses this source ID. Ask a developer to fix it.',
      ],
    ],
  )
})

test("an item whose series is gone keeps a reference Studio won't publish", async () => {
  // The series draft was deleted after the item draft was written: the speaker publishes, the
  // series doesn't exist, and the item can't publish.
  const studio = createHarness({documents: [SPEAKER, ITEM]})
  await studio.publish(publishedIdOf(SPEAKER))
  const markers = errors(await studio.validate(ITEM._id))
  assert.deepEqual(
    markers.map(({path, message}) => [path.replace(/\[.*$/, ''), message]),
    [['series', 'Referenced document must be published']],
  )
  await assert.rejects(studio.publish(publishedIdOf(ITEM)), /Referenced document must be published/)
})

test("every passage's display is Studio's reference text", () => {
  const passages = fixture('passages.json') as Record<string, unknown>[]
  assert.deepEqual(
    passages.map((passage) => passage.display),
    ['James 5:10-12', 'James 5', 'John 3:16-4:2', 'Psalm 23', 'Psalms 1-2'],
  )
  for (const passage of [...passages, ...(ITEM.passages as Record<string, unknown>[])]) {
    assert.equal(passage.display, referenceText(passage))
    assert.equal(passage.generatedDisplay, referenceText(passage))
  }
  // The writer refuses these, since Studio has no text for them: a range from a verse to the
  // end of a later chapter, and a book Studio doesn't list. The manifest's null is a value left
  // out.
  type ManifestPassage = {book: string; chapterStart: number; chapterEnd: number} & Record<
    'verseStart' | 'verseEnd',
    number | null
  >
  for (const passage of fixture('passages-refused.json') as ManifestPassage[]) {
    const {verseStart, verseEnd} = passage
    const value = {...passage, verseStart: verseStart ?? undefined, verseEnd: verseEnd ?? undefined}
    assert.equal(referenceText(value), undefined)
  }
})

test('an item draft with its passages validates them with no error', async () => {
  const passages = (fixture('passages.json') as Record<string, unknown>[]).map((passage, i) => ({
    ...passage,
    _key: `passage-${i + 1}`,
  }))
  const studio = createHarness({documents: [SERIES, SPEAKER, {...ITEM, passages}]})
  const markers = errors(await studio.validate(ITEM._id)).filter(({path}) =>
    path.startsWith('passages'),
  )
  assert.deepEqual(markers, [])
})

// Amendment A: a topic draft, and an item with a topic and a carried hold, an inactive editor
// hold whose note the merge carried from its Vimeo side.
test('the topic draft validates with no error', async () => {
  const studio = createHarness({documents: [TOPIC]})
  assert.deepEqual(errors(await studio.validate(TOPIC._id)), [])
})

test('an item with a topic and a carried hold: its only errors are its weak references until the topic, series and speaker publish', async () => {
  const studio = createHarness({documents: [SERIES, SPEAKER, TOPIC, ITEM_WITH_TOPIC]})
  const before = errors(await studio.validate(ITEM_WITH_TOPIC._id))
  assert.deepEqual(
    before.map(({path, message}) => [path.replace(/\[.*$/, ''), message]).sort(),
    [
      ['series', 'Referenced document must be published'],
      ['speakers', 'Referenced document must be published'],
      ['topics', 'Referenced document must be published'],
    ],
    JSON.stringify(before),
  )
  assert.deepEqual(ITEM_WITH_TOPIC.editorHold, {
    active: false,
    note: (ITEM_WITH_TOPIC.editorHold as {note: string}).note,
  })
  await studio.publish(publishedIdOf(SERIES))
  await studio.publish(publishedIdOf(SPEAKER))
  await assert.rejects(
    studio.publish(publishedIdOf(ITEM_WITH_TOPIC)),
    /Referenced document must be published/,
    'not before its topic',
  )
  await studio.publish(publishedIdOf(TOPIC))
  assert.deepEqual(errors(await studio.validate(ITEM_WITH_TOPIC._id)), [])
  const published = await studio.publish(publishedIdOf(ITEM_WITH_TOPIC))
  for (const field of ['series', 'speakers', 'topics']) {
    for (const ref of published[field] as Record<string, unknown>[]) {
      assert.ok(!('_weak' in ref), `${field}: _weak`)
      assert.ok(!('_strengthenOnPublish' in ref), `${field}: _strengthenOnPublish`)
    }
  }
  assert.equal((published.editorHold as {active: boolean}).active, false)
})
