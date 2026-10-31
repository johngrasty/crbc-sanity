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

// Erratum E85: source.aliases lists the other source IDs of the same content. Among documents of
// a type, a value has one holder across every source.sourceId and every source.aliases entry, and
// a document's published, draft and release versions are one holder.
const holderIds: Record<keyof typeof nouns, {sourceId: string; aliases: string[]}> = {
  mediaItem: {
    sourceId: 'subsplash:mi:+abc123',
    aliases: ['subsplash:mi:+Def456', 'vimeo:438910614'],
  },
  series: {sourceId: 'subsplash:ms:+abc123', aliases: ['vimeo:showcase:1234567']},
  speaker: {sourceId: 'subsplash:sp:+abc123', aliases: ['subsplash:sp:+def456']},
  topic: {sourceId: 'subsplash:tp:+abc123', aliases: ['subsplash:tp:+def456']},
}
const sourceErrors = (markers: Marker[]) =>
  markers
    .filter((marker) => marker.level === 'error' && marker.path.startsWith('source'))
    .map(({path, message}) => [path, message])
const types = Object.keys(nouns) as (keyof typeof nouns)[]

test('a source with aliases in the Subsplash and Vimeo forms, or with none, is fine', async () => {
  const sources = (type: keyof typeof nouns) => [
    holderIds[type],
    {sourceId: holderIds[type].sourceId},
    {sourceId: holderIds[type].sourceId, aliases: []},
  ]
  for (const type of types) {
    // Other documents with no aliases, or other types holding the same values, don't count.
    const studio = createHarness({
      documents: [
        {_id: 'other', _type: type, source: {sourceId: 'subsplash:+other'}},
        {_id: 'elsewhere', _type: type === 'topic' ? 'speaker' : 'topic', source: holderIds[type]},
      ],
    })
    for (const source of sources(type)) {
      const markers = await studio.validate({_id: 'a', _type: type, source})
      assert.deepEqual(sourceErrors(markers), [], `${type} ${JSON.stringify(source)}`)
    }
  }
  // A media item or series made from Vimeo alone has a Vimeo source ID.
  const studio = createHarness()
  for (const [type, sourceId] of [
    ['mediaItem', 'vimeo:438910614'],
    ['series', 'vimeo:showcase:1234567'],
  ]) {
    const markers = await studio.validate({_id: 'a', _type: type, source: {sourceId}})
    assert.deepEqual(sourceErrors(markers), [], type)
  }
})

test('an alias another document of the type holds as an alias is an error that names it', async () => {
  for (const type of types) {
    const alias = holderIds[type].aliases[0]
    const document = (_id: string, sourceId: string): TestDocument => ({
      _id,
      _type: type,
      source: {sourceId, aliases: [alias]},
    })
    // Two published holders: both show the error.
    const both = createHarness({documents: [document('a', 'one'), document('b', 'two')]})
    assert.deepEqual(sourceErrors(await both.validate('a')), [
      ['source.aliases[0]', sourceTaken(type, 'b')],
    ])
    assert.deepEqual(sourceErrors(await both.validate('b')), [
      ['source.aliases[0]', sourceTaken(type, 'a')],
    ])
    // A draft or release version that copies the published owner's alias is blocked, and doesn't
    // block the owner.
    for (const copy of ['drafts.b', 'versions.rSpring.b']) {
      const studio = createHarness({documents: [document('a', 'one'), document(copy, 'two')]})
      assert.deepEqual(sourceErrors(await studio.validate('a')), [], `${type} ${copy}`)
      assert.deepEqual(
        sourceErrors(await studio.validate(copy)),
        [['source.aliases[0]', sourceTaken(type, 'a')]],
        `${type} ${copy}`,
      )
    }
  }
})

test('a source ID another document of the type holds as an alias, or the reverse, is an error', async () => {
  for (const type of types) {
    const value = holderIds[type].aliases[0]
    const withAlias = (_id: string): TestDocument => ({
      _id,
      _type: type,
      source: {sourceId: 'one', aliases: [value]},
    })
    const withSourceId = (_id: string): TestDocument => ({
      _id,
      _type: type,
      source: {sourceId: value},
    })

    const both = createHarness({documents: [withAlias('a'), withSourceId('b')]})
    assert.deepEqual(sourceErrors(await both.validate('a')), [
      ['source.aliases[0]', sourceTaken(type, 'b')],
    ])
    assert.deepEqual(sourceErrors(await both.validate('b')), [
      ['source.sourceId', sourceTaken(type, 'a')],
    ])

    // The published holder owns the value, whichever field holds it.
    const aliasOwns = createHarness({documents: [withAlias('a'), withSourceId('drafts.b')]})
    assert.deepEqual(sourceErrors(await aliasOwns.validate('a')), [], type)
    assert.deepEqual(sourceErrors(await aliasOwns.validate('drafts.b')), [
      ['source.sourceId', sourceTaken(type, 'a')],
    ])
    const sourceIdOwns = createHarness({documents: [withSourceId('a'), withAlias('drafts.b')]})
    assert.deepEqual(sourceErrors(await sourceIdOwns.validate('a')), [], type)
    assert.deepEqual(sourceErrors(await sourceIdOwns.validate('drafts.b')), [
      ['source.aliases[0]', sourceTaken(type, 'a')],
    ])
  }
})

test("an alias that repeats another, or the document's own source ID, is an error", async () => {
  const studio = createHarness()
  for (const type of types) {
    const {sourceId, aliases} = holderIds[type]
    const markers = await studio.validate({
      _id: 'a',
      _type: type,
      source: {sourceId, aliases: [aliases[0], sourceId, aliases[0], 'vimeo:1', 'vimeo:1']},
    })
    assert.deepEqual(
      sourceErrors(markers),
      [
        [
          'source.aliases[1]',
          `This is already the source ID of this ${nouns[type]}, so it can't also be an alias. Ask a developer to fix it.`,
        ],
        ['source.aliases[2]', 'This source ID is already in the list. Ask a developer to fix it.'],
        ['source.aliases[4]', 'This source ID is already in the list. Ask a developer to fix it.'],
      ],
      type,
    )
  }
})

test("a document's own versions may hold its source ID and aliases, in either field", async () => {
  for (const type of types) {
    const {sourceId, aliases} = holderIds[type]
    const swapped = {sourceId: aliases[0], aliases: [sourceId]}
    const studio = createHarness({
      documents: [
        {_id: 'a', _type: type, source: holderIds[type]},
        {_id: 'drafts.a', _type: type, source: holderIds[type]},
        {_id: 'versions.rSpring.a', _type: type, source: swapped},
      ],
    })
    for (const _id of ['a', 'drafts.a', 'versions.rSpring.a']) {
      assert.deepEqual(sourceErrors(await studio.validate(_id)), [], `${type} ${_id}`)
    }
  }
})
