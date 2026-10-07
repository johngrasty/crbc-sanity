import assert from 'node:assert/strict'
import {Buffer} from 'node:buffer'
import {test} from 'node:test'
import {createHarness, type Marker, type TestDocument} from './harness.ts'

const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)

// Every URL field in the editorial types, as a path and a way to put a URL there.
const urlFields: {type: string; path: string; set: (url: string) => Record<string, unknown>}[] = [
  ...['mediaItem', 'series', 'speaker', 'topic'].map((type) => ({
    type,
    path: 'source.sourceUrl',
    set: (sourceUrl: string) => ({source: {sourceId: 'subsplash:+abc123', sourceUrl}}),
  })),
  {
    type: 'mediaItem',
    path: 'audioEnclosure.url',
    set: (url: string) => ({
      audioEnclosure: {url, mimeType: 'audio/mpeg', bytes: 48_000_000, guid: 'crbc-easter-2026'},
    }),
  },
]

async function markersFor(
  {type, path, set}: (typeof urlFields)[number],
  url: string,
): Promise<Marker[]> {
  const studio = createHarness()
  const created: TestDocument = await studio.create(type)
  return errorsAt(await studio.validate({...created, ...set(url)}), path)
}

// A URL of exactly the given number of UTF-8 bytes: an https address, then the character as many
// times as fits, then plain letters for any bytes left over.
function urlOfBytes(bytes: number, character: string): string {
  const start = 'https://example.org/'
  const characterBytes = Buffer.byteLength(character)
  const repeats = Math.floor((bytes - start.length) / characterBytes)
  const url = start + character.repeat(repeats)
  return url + 'a'.repeat(bytes - Buffer.byteLength(url))
}

test('a URL holds up to 2,048 UTF-8 bytes, so multibyte text reaches the limit sooner', async () => {
  for (const field of urlFields) {
    // é takes two bytes, あ three and 😀 four, so each URL has far fewer than 2,048 characters.
    for (const character of ['é', 'あ', '😀']) {
      const atLimit = urlOfBytes(2048, character)
      const pastLimit = urlOfBytes(2049, character)
      assert.equal(Buffer.byteLength(atLimit), 2048)
      assert.equal(Buffer.byteLength(pastLimit), 2049)
      assert.ok([...pastLimit].length < 2048)
      const label = `${field.type} ${field.path} with ${character}`
      assert.deepEqual(await markersFor(field, atLimit), [], `${label} at 2,048 bytes`)
      assert.equal((await markersFor(field, pastLimit)).length, 1, `${label} at 2,049 bytes`)
    }
  }
})

test('a URL holds up to 2,048 characters', async () => {
  for (const field of urlFields) {
    const label = `${field.type} ${field.path}`
    assert.deepEqual(await markersFor(field, urlOfBytes(2048, 'a')), [], label)
    assert.equal((await markersFor(field, urlOfBytes(2049, 'a'))).length, 1, label)
  }
})

test('a URL starts with http:// or https://', async () => {
  for (const field of urlFields) {
    for (const url of ['http://example.org/a', 'https://example.org/a']) {
      assert.deepEqual(await markersFor(field, url), [], `${field.type} ${field.path} ${url}`)
    }
    for (const url of ['ftp://example.org/a', 'javascript:alert(1)', 'example.org/a']) {
      const label = `${field.type} ${field.path} ${url}`
      assert.equal((await markersFor(field, url)).length, 1, label)
    }
  }
})
