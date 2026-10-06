import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker} from './harness.ts'

// Contract section 2: each kind's prefix and a ULID, 26 characters of Crockford base32.
const ids = {
  speaker: {field: 'speakerId', pattern: /^sp_[0-9A-HJKMNP-TV-Z]{26}$/},
  topic: {field: 'topicId', pattern: /^tp_[0-9A-HJKMNP-TV-Z]{26}$/},
}

// The field each type is named by.
const nameFields = {speaker: 'name', topic: 'label'}

const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)

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
