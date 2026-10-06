import assert from 'node:assert/strict'
import {readFileSync, readdirSync} from 'node:fs'
import {join} from 'node:path'
import {test} from 'node:test'
import {fileURLToPath} from 'node:url'
import contract from '../media-contract/schemas/media-v1.schema.json' with {type: 'json'}
import {createHarness, type Marker, type TestDocument} from './harness.ts'

const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)

const fixturesDir = fileURLToPath(new URL('../media-contract/fixtures/sanity/', import.meta.url))
const fixtures: TestDocument[] = readdirSync(fixturesDir)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => JSON.parse(readFileSync(join(fixturesDir, file), 'utf8')))

// Field paths use the harness's form: captions, captions[] for an array's members and
// captions[].label for a member's field. Keys that start with _ are Sanity's system fields,
// such as _id and _rev, which no type declares.
type JsonSchema = {
  $ref?: string
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  allOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  anyOf?: JsonSchema[]
}
const definitions = contract.$defs as Record<string, JsonSchema>

// Every field a JSON Schema definition allows, with its JSON type. A definition's branches
// (allOf, oneOf, anyOf) all add fields. if and then only constrain fields named elsewhere.
function schemaFields(schema: JsonSchema, prefix = '', found = new Map<string, string>()) {
  if (schema.$ref) {
    schemaFields(definitions[schema.$ref.replace('#/$defs/', '')], prefix, found)
  }
  for (const branch of [
    ...(schema.allOf ?? []),
    ...(schema.oneOf ?? []),
    ...(schema.anyOf ?? []),
  ]) {
    schemaFields(branch, prefix, found)
  }
  if (prefix) {
    const types = [schema.type ?? []].flat().filter((type) => type !== 'null')
    for (const type of types) found.set(prefix, type === 'integer' ? 'number' : type)
  }
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    if (!name.startsWith('_')) schemaFields(property, prefix ? `${prefix}.${name}` : name, found)
  }
  if (schema.items) schemaFields(schema.items, `${prefix}[]`, found)
  return found
}

// Every field path a stored document uses.
function documentFields(value: unknown, prefix = '', found = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const member of value) documentFields(member, `${prefix}[]`, found.add(`${prefix}[]`))
  } else if (value && typeof value === 'object') {
    for (const [name, field] of Object.entries(value)) {
      if (name.startsWith('_')) continue
      const path = prefix ? `${prefix}.${name}` : name
      documentFields(field, path, found.add(path))
    }
  }
  return found
}

test('every Sanity fixture in the contract validates without errors', async () => {
  assert.equal(fixtures.length, 5)
  const studio = createHarness({documents: fixtures})
  for (const fixture of fixtures) {
    const markers = await studio.validate(fixture._id)
    assert.deepEqual(markers, [], fixture._id)
  }
})

test('the mirror types declare every field of their contract definitions, with its JSON type', () => {
  const studio = createHarness()
  for (const [type, definition] of [
    ['mediaRelease', 'SanityMediaRelease'],
    ['liveStatus', 'SanityLiveStatus'],
  ]) {
    const declared = Object.fromEntries(
      studio.fields(type).map(({path, jsonType}) => [path, jsonType]),
    )
    const expected = Object.fromEntries(schemaFields(definitions[definition]))
    assert.deepEqual(declared, expected, type)
  }
})

test('the mirror types declare every field the fixtures use', () => {
  const studio = createHarness()
  for (const fixture of fixtures) {
    const declared = new Set(studio.fields(fixture._type).map(({path}) => path))
    const undeclared = [...documentFields(fixture)].filter((path) => !declared.has(path))
    assert.deepEqual(undeclared, [], fixture._id)
  }
})

test("a draft or release version of a mirror document is an error, so it can't publish", async () => {
  // The published fixtures' IDs contain dots, such as mediaRelease.production.mi_..., and the
  // first test shows they validate. Only a drafts. or versions. prefix makes an ID unpublished.
  for (const fixture of fixtures) {
    const draft = {...fixture, _id: `drafts.${fixture._id}`}
    const version = {...fixture, _id: `versions.rSpring.${fixture._id}`}
    const studio = createHarness({documents: [draft, version]})
    for (const {_id} of [draft, version]) {
      const errors = errorsAt(await studio.validate(_id), '')
      assert.equal(errors.length, 1, _id)
      assert.match(errors[0].message, /^media-ops writes this document/, _id)
    }
    await assert.rejects(studio.publish(fixture._id), /validation errors/)
    await assert.rejects(studio.publish(fixture._id, {release: 'rSpring'}), /validation errors/)
    assert.deepEqual(
      studio.documents().map(({_id}) => _id),
      [draft._id, version._id].sort(),
    )
  }
})
