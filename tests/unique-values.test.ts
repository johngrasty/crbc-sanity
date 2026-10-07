// Values that must be unique among documents of a type: the import source ID and a media item's
// podcast GUID. A published document owns its value, as it owns its editorial ID, so a draft that
// copies the value is blocked and doesn't block the owner.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker, type TestDocument} from './harness.ts'

const messagesAt = (markers: Marker[], path: string) =>
  markers
    .filter((marker) => marker.level === 'error' && marker.path === path)
    .map(({message}) => message)

const nouns = {mediaItem: 'media item', series: 'series', speaker: 'speaker', topic: 'topic'}
const source = {sourceId: 'subsplash:+abc123'}
const sourceTaken = (type: keyof typeof nouns, _id: string) =>
  `The ${nouns[type]} ${_id} already uses this source ID. Ask a developer to fix it.`

test("a draft that copies a published document's source ID doesn't block it, and names it", async () => {
  for (const type of Object.keys(nouns) as (keyof typeof nouns)[]) {
    const document = (_id: string, fields = {}): TestDocument => ({
      _id,
      _type: type,
      source,
      ...fields,
    })
    const studio = createHarness({
      documents: [document('a'), document('drafts.a', {aliases: ['Edited']}), document('drafts.b')],
    })
    assert.deepEqual(messagesAt(await studio.validate('a'), 'source.sourceId'), [], type)
    assert.deepEqual(messagesAt(await studio.validate('drafts.a'), 'source.sourceId'), [], type)
    assert.deepEqual(
      messagesAt(await studio.validate('drafts.b'), 'source.sourceId'),
      [sourceTaken(type, 'a')],
      type,
    )
  }
})

test('two published documents that share a source ID both show an error that names the other', async () => {
  for (const type of Object.keys(nouns) as (keyof typeof nouns)[]) {
    const document = (_id: string): TestDocument => ({_id, _type: type, source})
    const studio = createHarness({documents: [document('a'), document('b'), document('drafts.a')]})
    for (const [_id, other] of [
      ['a', 'b'],
      ['drafts.a', 'b'],
      ['b', 'a'],
    ]) {
      assert.deepEqual(
        messagesAt(await studio.validate(_id), 'source.sourceId'),
        [sourceTaken(type, other)],
        `${type} ${_id}`,
      )
    }
  }
})

const audioEnclosure = {
  url: 'https://media.example.org/easter.mp3',
  mimeType: 'audio/mpeg',
  bytes: 48_000_000,
  guid: 'crbc-easter-2026',
}
const item = (_id: string): TestDocument => ({_id, _type: 'mediaItem', audioEnclosure})
const guidTaken = (_id: string) =>
  `The media item ${_id} already uses this GUID, so podcast apps would mix up the two episodes. Use a different GUID.`

test("a draft that copies a published item's podcast GUID doesn't block it, and names it", async () => {
  const studio = createHarness({
    documents: [item('a'), {...item('drafts.a'), title: 'Edited'}, item('drafts.b')],
  })
  assert.deepEqual(messagesAt(await studio.validate('a'), 'audioEnclosure.guid'), [])
  assert.deepEqual(messagesAt(await studio.validate('drafts.a'), 'audioEnclosure.guid'), [])
  assert.deepEqual(messagesAt(await studio.validate('drafts.b'), 'audioEnclosure.guid'), [
    guidTaken('a'),
  ])
})

test('two published items that share a podcast GUID both show an error that names the other', async () => {
  const studio = createHarness({documents: [item('a'), item('b'), item('drafts.a')]})
  for (const [_id, other] of [
    ['a', 'b'],
    ['drafts.a', 'b'],
    ['b', 'a'],
  ]) {
    assert.deepEqual(
      messagesAt(await studio.validate(_id), 'audioEnclosure.guid'),
      [guidTaken(other)],
      _id,
    )
  }
})
