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

// One harness and one new document for each type, made on first use.
const studio = createHarness()
const created = new Map<string, Promise<TestDocument>>()

async function markersFor(
  {type, path, set}: (typeof urlFields)[number],
  url: string,
): Promise<Marker[]> {
  if (!created.has(type)) created.set(type, studio.create(type))
  const document = await created.get(type)!
  return errorsAt(await studio.validate({...document, ...set(url)}), path)
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

// Each message names its own problem, so a test can tell which one a URL got.
const problems = {
  scheme: /starts with http:\/\/ or https:\/\//,
  syntax: /isn't a valid web address/,
  encoding: /writes é as %C3%A9/,
  length: /too long/,
}
type Problem = keyof typeof problems

// The one error a URL gets at each URL field, as the problem it names.
async function problemsFor(url: string): Promise<Map<string, Problem[]>> {
  const found = new Map<string, Problem[]>()
  for (const field of urlFields) {
    const named = (await markersFor(field, url)).map(({message}) => {
      const problem = (Object.keys(problems) as Problem[]).find((name) =>
        problems[name].test(message),
      )
      return problem ?? (message as Problem)
    })
    found.set(`${field.type} ${field.path}`, named)
  }
  return found
}

async function assertProblem(url: string, expected: Problem[]) {
  for (const [field, found] of await problemsFor(url)) {
    assert.deepEqual(found, expected, `${field} ${url.slice(0, 80)}`)
  }
}

test('a URL may hold a user name and password, an IPv6 host, a port and percent escapes', async () => {
  for (const url of [
    'https://user@example.org/a',
    'https://user:pass@example.org:8443/a',
    'https://us%40er:p%3Ass@example.org/a',
    'https://[2001:db8::1]:8443/a',
    'http://[::1]/',
    'https://[::ffff:192.0.2.1]/a',
    'https://192.0.2.1/a',
    'HTTPS://Example.ORG/A',
    'https://example.org/a?b=c&d=e#f/g?h',
  ]) {
    await assertProblem(url, [])
  }
})

test('square brackets are allowed only around an IPv6 host, and their encoded forms pass anywhere', async () => {
  for (const url of [
    'https://u[1]@example.org/',
    'https://[example.org]/',
    'https://exa[mple.org/',
    'https://[2001:db8::1/',
    'https://[v1.fe]/',
    'https://example.org/[x]',
    'https://example.org/?q=[x]',
    'https://example.org/#[x]',
  ]) {
    await assertProblem(url, ['syntax'])
  }
  for (const url of [
    'https://u%5B1%5D@example.org/',
    'https://example.org/%5Bx%5D',
    'https://example.org/?q=%5Bx%5D',
    'https://example.org/#%5Bx%5D',
  ]) {
    await assertProblem(url, [])
  }
})

test('a URL has at most one #, valid percent escapes, a host and a numeric port', async () => {
  for (const url of [
    'https://example.org/#x#y',
    'https://example.org/a##',
    'https://example.org/100%',
    'https://example.org/%zz',
    'https://example.org/%C',
    'https://',
    'https:///a',
    'https://example.org:80a/',
  ]) {
    await assertProblem(url, ['syntax'])
  }
  await assertProblem('https://example.org/#x%23y', [])
})

test('a URL that fails two or three checks gets one error, for the first in order', async () => {
  const long = 'é'.repeat(2100)
  const cases: [string, Problem][] = [
    // Scheme and characters.
    ['ftp://example.org/é', 'scheme'],
    // Scheme and syntax.
    ['ftp://example.org/#x#y', 'scheme'],
    // Syntax and characters.
    ['https://example.org/[é]', 'syntax'],
    // Syntax and length.
    [`https://example.org/${'a'.repeat(2100)}#x#y`, 'syntax'],
    // Characters and length.
    [`https://example.org/${long}`, 'encoding'],
    // Scheme, characters and length.
    [`ftp://example.org/${long}`, 'scheme'],
    // Syntax, characters and length.
    [`https://example.org/[${long}]`, 'syntax'],
  ]
  for (const [url, problem] of cases) await assertProblem(url, [problem])
})
