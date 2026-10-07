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
