import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker, type TestDocument} from './harness.ts'

// Contract section 2: each kind's prefix and a ULID, 26 characters of Crockford base32.
const ids = {
  speaker: {field: 'speakerId', pattern: /^sp_[0-9A-HJKMNP-TV-Z]{26}$/},
  topic: {field: 'topicId', pattern: /^tp_[0-9A-HJKMNP-TV-Z]{26}$/},
}

// The field each type is named by.
const nameFields: Record<string, string> = {speaker: 'name', topic: 'label'}

const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)
const errors = (markers: Marker[]) => markers.filter((marker) => marker.level === 'error')
const warningsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'warning' && marker.path === path)

// é is one UTF-16 unit and two UTF-8 bytes. 😀 is one code point and two UTF-16 units. The
// contract's JSON Schema counts code points, so both count as one character.
const characters = ['é', '😀']

test('a new speaker or topic gets a well-formed ID of its kind, and two new ones differ', async () => {
  const studio = createHarness()
  for (const [type, {field, pattern}] of Object.entries(ids)) {
    const first = await studio.create(type)
    const second = await studio.create(type)
    assert.match(String(first[field]), pattern, type)
    assert.match(String(second[field]), pattern, type)
    assert.notEqual(first[field], second[field], type)
  }
})

test("a speaker's name and a topic's label are required", async () => {
  const studio = createHarness()
  for (const [type, field] of Object.entries(nameFields)) {
    const document = await studio.create(type)
    for (const value of [undefined, '']) {
      const markers = await studio.validate({...document, [field]: value})
      assert.equal(errorsAt(markers, field).length, 1, `${type} ${field} ${value}`)
    }
    assert.deepEqual(errorsAt(await studio.validate({...document, [field]: 'Grace'}), field), [])
  }
})

test('a name or label holds up to 200 characters, counted as Unicode code points', async () => {
  const studio = createHarness()
  for (const [type, field] of Object.entries(nameFields)) {
    const document = await studio.create(type)
    for (const character of characters) {
      const atLimit = await studio.validate({...document, [field]: character.repeat(200)})
      assert.deepEqual(errorsAt(atLimit, field), [], `${type} 200 × ${character}`)
      const pastLimit = await studio.validate({...document, [field]: character.repeat(201)})
      assert.equal(errorsAt(pastLimit, field).length, 1, `${type} 201 × ${character}`)
    }
  }
})

const types = Object.keys(nameFields)
const aliasList = (count: number) => Array.from({length: count}, (_, index) => `Alias ${index + 1}`)

test('aliases hold up to 20 names', async () => {
  const studio = createHarness()
  for (const type of types) {
    const document = await studio.create(type)
    const atLimit = await studio.validate({...document, aliases: aliasList(20)})
    assert.deepEqual(errorsAt(atLimit, 'aliases'), [], `${type} 20 aliases`)
    const pastLimit = await studio.validate({...document, aliases: aliasList(21)})
    assert.equal(errorsAt(pastLimit, 'aliases').length, 1, `${type} 21 aliases`)
  }
})

test('an alias holds up to 200 characters, counted as Unicode code points', async () => {
  const studio = createHarness()
  for (const type of types) {
    const document = await studio.create(type)
    for (const character of characters) {
      const aliases = ['Short', character.repeat(200), character.repeat(201)]
      const markers = await studio.validate({...document, aliases})
      assert.deepEqual(errorsAt(markers, 'aliases[1]'), [], `${type} 200 × ${character}`)
      assert.equal(errorsAt(markers, 'aliases[2]').length, 1, `${type} 201 × ${character}`)
    }
  }
})

// Search ignores case, so an alias that differs only in case finds nothing new.
test('an alias that repeats an earlier one is an error, whatever its case', async () => {
  const studio = createHarness()
  for (const type of types) {
    const document = await studio.create(type)
    const markers = await studio.validate({
      ...document,
      aliases: ['Pastor Sam', 'Sam', 'pastor sam', 'Sam'],
    })
    const repeated = markers.filter(({path}) => path.startsWith('aliases'))
    assert.deepEqual(
      repeated.map(({path, level}) => [path, level]),
      [
        ['aliases[2]', 'error'],
        ['aliases[3]', 'error'],
      ],
      type,
    )
    const distinct = await studio.validate({...document, aliases: ['Pastor Sam', 'Sam']})
    assert.deepEqual(
      distinct.filter(({path}) => path.startsWith('aliases')),
      [],
      type,
    )
  }
})

test('a second speaker with the same name, or a second topic with the same label, is a warning', async () => {
  for (const [type, field] of Object.entries(nameFields)) {
    // Another document's published, draft or release version, in any case.
    for (const [_id, value] of [
      ['other', 'Sam Jones'],
      ['drafts.other', 'Sam Jones'],
      ['versions.rSpring.other', 'Sam Jones'],
      ['other', 'SAM JONES'],
    ]) {
      const studio = createHarness({documents: [{_id, _type: type, [field]: value}]})
      const created = await studio.create(type)
      const edited = await studio.edit(created._id, {set: {[field]: 'Sam Jones'}})
      const markers = await studio.validate(edited._id)
      assert.equal(warningsAt(markers, field).length, 1, `${type} named like ${_id} ${value}`)
      assert.deepEqual(errorsAt(markers, field), [], `${type} named like ${_id} ${value}`)
    }
  }
})

test("a speaker or topic's own versions, another type and another name don't count as a second one", async () => {
  for (const [type, field] of Object.entries(nameFields)) {
    const otherType = type === 'speaker' ? 'topic' : 'speaker'
    const studio = createHarness({
      documents: [
        {_id: 'self', _type: type, [field]: 'Sam Jones'},
        {_id: 'versions.rSpring.self', _type: type, [field]: 'Sam Jones'},
        {_id: 'other', _type: type, [field]: 'Ann Lee'},
        {_id: 'elsewhere', _type: otherType, [nameFields[otherType]]: 'Sam Jones'},
      ],
    })
    const draft = await studio.edit('self', {set: {[field]: 'Sam Jones'}})
    assert.deepEqual(warningsAt(await studio.validate(draft._id), field), [], type)
    assert.deepEqual(warningsAt(await studio.validate('versions.rSpring.self'), field), [], type)
  }
})

// What the importer writes (contract sections 2 and 3).
const source = {
  sourceId: 'subsplash:sp:+abc123',
  sourceUrl: 'https://subsplash.com/crbc/media/sp/+abc123',
  originalPublishedAt: '2024-03-31T13:00:00Z',
}

test('an imported speaker or topic keeps where it came from', async () => {
  const studio = createHarness()
  for (const type of types) {
    const document = await studio.create(type)
    const markers = await studio.validate({...document, source})
    assert.deepEqual(
      markers.filter(({path}) => path.startsWith('source')),
      [],
      type,
    )
  }
})

test('a source ID another document of the same type uses is an error, in any of its versions', async () => {
  for (const type of types) {
    for (const other of ['other', 'drafts.other', 'versions.rSpring.other']) {
      const studio = createHarness({documents: [{_id: other, _type: type, source}]})
      const created = await studio.create(type)
      const edited = await studio.edit(created._id, {set: {source}})
      const markers = await studio.validate(edited._id)
      assert.equal(errorsAt(markers, 'source.sourceId').length, 1, `${type} taken by ${other}`)
    }
  }
})

test("a document's own versions and other types may share its source ID", async () => {
  for (const type of types) {
    const otherType = type === 'speaker' ? 'topic' : 'speaker'
    const studio = createHarness({
      documents: [
        {_id: 'self', _type: type, source},
        {_id: 'versions.rSpring.self', _type: type, source},
        {_id: 'elsewhere', _type: otherType, source},
        {_id: 'item', _type: 'mediaItem', source},
      ],
    })
    const draft = await studio.edit('self', {set: {[nameFields[type]]: 'Grace'}})
    for (const _id of [draft._id, 'self', 'versions.rSpring.self']) {
      assert.deepEqual(
        errorsAt(await studio.validate(_id), 'source.sourceId'),
        [],
        `${type} ${_id}`,
      )
    }
  }
})

test('a source URL is an http or https address', async () => {
  const studio = createHarness()
  for (const type of types) {
    const document = await studio.create(type)
    for (const sourceUrl of ['http://subsplash.com/crbc', 'https://subsplash.com/crbc']) {
      const markers = await studio.validate({...document, source: {...source, sourceUrl}})
      assert.deepEqual(errorsAt(markers, 'source.sourceUrl'), [], `${type} ${sourceUrl}`)
    }
    for (const sourceUrl of ['ftp://subsplash.com/crbc', 'javascript:alert(1)', 'subsplash.com']) {
      const markers = await studio.validate({...document, source: {...source, sourceUrl}})
      assert.equal(errorsAt(markers, 'source.sourceUrl').length, 1, `${type} ${sourceUrl}`)
    }
  }
})

const photo = {
  _type: 'image',
  asset: {_type: 'reference', _ref: 'image-a1b2c3-400x400-jpg'},
  alt: 'Sam Jones smiling',
}

test("a speaker photo's alt text holds up to 200 characters, counted as Unicode code points", async () => {
  const studio = createHarness({
    documents: [{_id: 'image-a1b2c3-400x400-jpg', _type: 'sanity.imageAsset'}],
  })
  const speaker = await studio.create('speaker')
  assert.deepEqual(errorsAt(await studio.validate({...speaker, photo}), 'photo'), [])
  for (const character of characters) {
    const atLimit = await studio.validate({
      ...speaker,
      photo: {...photo, alt: character.repeat(200)},
    })
    assert.deepEqual(errorsAt(atLimit, 'photo.alt'), [], `200 × ${character}`)
    const pastLimit = await studio.validate({
      ...speaker,
      photo: {...photo, alt: character.repeat(201)},
    })
    assert.equal(errorsAt(pastLimit, 'photo.alt').length, 1, `201 × ${character}`)
  }
})

const ULID = '01K6Z8Y4N3QJ5W2X7R9T0V1B2C'
const imageAsset = {_id: 'image-a1b2c3-400x400-jpg', _type: 'sanity.imageAsset'}
const originals: Record<string, TestDocument> = {
  speaker: {
    _id: 'pastor',
    _type: 'speaker',
    speakerId: `sp_${ULID}`,
    name: 'Sam Jones',
    aliases: ['Pastor Sam'],
    photo,
    source,
  },
  topic: {
    _id: 'grace',
    _type: 'topic',
    topicId: `tp_${ULID}`,
    label: 'Grace',
    aliases: ['Mercy'],
    source,
  },
}

// The source ID must stay unique, so a copy that kept it would fail validation.
test('a duplicated speaker or topic drops its import source, keeps the rest, and has no errors', async () => {
  for (const [type, original] of Object.entries(originals)) {
    const studio = createHarness({documents: [original, imageAsset]})
    const copy = await studio.duplicate(original._id)
    const {
      _id,
      _rev,
      _createdAt,
      _updatedAt,
      [ids[type as keyof typeof ids].field]: id,
      ...fields
    } = copy
    assert.ok(_id && _rev && _createdAt && _updatedAt && id, type)
    const {_id: originalId, source: originalSource, ...kept} = original
    assert.ok(originalId && originalSource)
    delete kept[ids[type as keyof typeof ids].field]
    assert.deepEqual(fields, kept, type)

    assert.deepEqual(errors(await studio.validate(copy._id)), [], `${type} copy`)
    assert.deepEqual(errors(await studio.validate(original._id)), [], `${type} original`)
    // The copy shares the original's name, which is what the warning is for.
    assert.equal(warningsAt(await studio.validate(copy._id), nameFields[type]).length, 1, type)
  }
})
