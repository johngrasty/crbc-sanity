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

// An https address of exactly the given length, padded with plain letters. Each character of an
// ASCII URL is one UTF-8 byte, so its length in characters and in bytes is the same.
function urlOfLength(length: number): string {
  const start = 'https://example.org/'
  return start + 'a'.repeat(length - start.length)
}

test('a URL holds up to 2,048 characters, which are also its 2,048 UTF-8 bytes', async () => {
  for (const field of urlFields) {
    const label = `${field.type} ${field.path}`
    const atLimit = urlOfLength(2048)
    const pastLimit = urlOfLength(2049)
    assert.equal(Buffer.byteLength(atLimit), 2048)
    assert.equal(Buffer.byteLength(pastLimit), 2049)
    assert.deepEqual(await markersFor(field, atLimit), [], `${label} at 2,048`)
    assert.equal((await markersFor(field, pastLimit)).length, 1, `${label} at 2,049`)
  }
})

// The contract's Url has format uri, which allows only ASCII. A browser's address bar copies
// other characters percent-encoded.
test('a URL with a character outside ASCII is an error, and its percent-encoded form passes', async () => {
  for (const field of urlFields) {
    const label = `${field.type} ${field.path}`
    const markers = await markersFor(field, 'https://example.org/sermón')
    assert.equal(markers.length, 1, label)
    assert.match(markers[0].message, /writes é as %C3%A9/, label)
    assert.deepEqual(await markersFor(field, 'https://example.org/serm%C3%B3n'), [], label)
    // A space is ASCII, but the contract's uri format refuses it too.
    assert.equal((await markersFor(field, 'https://example.org/sermon notes')).length, 1, label)
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
