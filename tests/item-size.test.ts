// The size check (contract section 10.2, spec proposal S3). Studio counts bytes with TextEncoder,
// because the contract's serializedBytes uses Node's Buffer, which the browser bundle lacks.
import assert from 'node:assert/strict'
import {readFileSync, readdirSync} from 'node:fs'
import {test} from 'node:test'
import {serializedBytes} from '../media-contract/src/size.ts'
import {serializedSize} from '../schemaTypes/media/bytes.ts'

const fixtures = new URL('../media-contract/fixtures/sanity/', import.meta.url)

test("Studio's byte count equals the contract's serializedBytes on the same values", () => {
  const values: unknown[] = [
    '',
    'Easter Sunday',
    // Two, three and four UTF-8 bytes per character.
    'é'.repeat(200),
    'あ'.repeat(200),
    '😀'.repeat(200),
    // Characters compact JSON escapes: a quote, a backslash, control characters and lone
    // surrogates, which JSON writes as \u escapes.
    '"\\\n\t\u0000\u001f',
    '\ud800 and \udfff',
    0,
    -0,
    1.5,
    1e21,
    Number.MAX_VALUE,
    true,
    null,
    [],
    {},
    {title: 'Grace 😀', speakers: [{id: 'sp_01K6Z8Y4N3QJ5W2X7R9T0V1B2C', name: 'Ann Lée'}]},
    ...readdirSync(fixtures).map((name) =>
      JSON.parse(readFileSync(new URL(name, fixtures), 'utf8')),
    ),
  ]
  for (const value of values) {
    assert.equal(serializedSize(value), serializedBytes(value), JSON.stringify(value))
  }
})
