import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker} from './harness.ts'

// Contract section 2: each kind's prefix and a ULID, 26 characters of Crockford base32.
const ids = {
  speaker: {field: 'speakerId', pattern: /^sp_[0-9A-HJKMNP-TV-Z]{26}$/},
  topic: {field: 'topicId', pattern: /^tp_[0-9A-HJKMNP-TV-Z]{26}$/},
}

// The field each type is named by.
const nameFields: Record<string, string> = {speaker: 'name', topic: 'label'}

const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)
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
