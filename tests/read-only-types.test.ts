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

// The binding in media-dev, as proposed erratum S2 has it. The contract has no fixture for it.
const binding = {
  _id: 'mediaOps.binding',
  _type: 'mediaOpsBinding',
  environments: ['dev', 'staging'],
}

// One stored document of each read-only type, and who writes it.
const samples = [...fixtures, binding]
const writers: Record<string, string> = {
  mediaRelease: 'media-ops',
  liveStatus: 'media-ops',
  mediaOpsBinding: 'An admin',
}
const readOnlyTypes = Object.keys(writers)

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

test("a draft or release version of a read-only document is an error, so it can't publish", async () => {
  // The published IDs contain dots, such as mediaRelease.production.mi_... and
  // mediaOps.binding, and they validate. Only a drafts. or versions. prefix makes an ID
  // unpublished.
  for (const sample of samples) {
    const draft = {...sample, _id: `drafts.${sample._id}`}
    const version = {...sample, _id: `versions.rSpring.${sample._id}`}
    const studio = createHarness({documents: [sample, draft, version]})
    assert.deepEqual(errorsAt(await studio.validate(sample._id), ''), [], sample._id)
    for (const {_id} of [draft, version]) {
      const errors = errorsAt(await studio.validate(_id), '')
      assert.equal(errors.length, 1, _id)
      assert.ok(errors[0].message.startsWith(`${writers[sample._type]} writes this document`), _id)
    }
    await assert.rejects(studio.publish(sample._id), /validation errors/)
    await assert.rejects(studio.publish(sample._id, {release: 'rSpring'}), /validation errors/)
    assert.deepEqual(
      studio.documents(),
      [sample, draft, version].sort((a, b) => a._id.localeCompare(b._id)),
    )
  }
})

test('the binding lists the environments that may write mirrors there', async () => {
  const studio = createHarness()
  assert.deepEqual(
    studio.fields('mediaOpsBinding').map(({path, jsonType}) => [path, jsonType]),
    [
      ['environments', 'array'],
      ['environments[]', 'string'],
    ],
  )
  for (const environments of [
    ['production'],
    ['dev', 'staging'],
    ['dev', 'staging', 'production'],
  ]) {
    assert.deepEqual(await studio.validate({...binding, environments}), [], `${environments}`)
  }
  const unknown = await studio.validate({...binding, environments: ['dev', 'prod']})
  assert.deepEqual(
    unknown.map(({path, level}) => [path, level]),
    [['environments[1]', 'error']],
  )
  assert.match(unknown[0].message, /"prod"/)
})

test('the read-only types have no document actions, in any version type', () => {
  const studio = createHarness()
  const versionTypes = ['draft', 'published', 'version', 'scheduled-draft', 'revision'] as const
  // The plugin chain hands the root resolver a different list for each version type, so the
  // test checks each one. Media items still get theirs, which shows the chain ran.
  for (const versionType of versionTypes) {
    assert.ok(studio.actions('mediaItem', versionType).length > 0, versionType)
    for (const type of readOnlyTypes) {
      assert.deepEqual(studio.actions(type, versionType), [], `${type} ${versionType}`)
    }
  }
})

test('the read-only types have no template and no create menu offers them', async () => {
  const studio = createHarness()
  const global = studio.createMenu()
  assert.ok(global.includes('mediaItem'), 'the global menu still offers media items')
  for (const type of readOnlyTypes) {
    await assert.rejects(studio.create(type), /No template/, type)
    assert.ok(!global.includes(type), `global ${type}`)
    assert.deepEqual(studio.createMenu({type: 'structure', schemaType: type}), [], `list ${type}`)
    // A reference field's "Create new" starts from every template, then keeps its own types.
    const reference = studio.createMenu({
      type: 'document',
      documentId: 'x',
      schemaType: 'mediaItem',
    })
    assert.ok(!reference.includes(type), `reference field ${type}`)
  }
  assert.deepEqual(studio.documents(), [])
})

test("global search and the release tool's Add document leave out the read-only types", () => {
  const studio = createHarness()
  const searched = studio.search()
  assert.ok(searched.includes('mediaItem'), 'search still covers media items')
  for (const type of readOnlyTypes) assert.ok(!searched.includes(type), type)
})

// A patch to one field of each read-only type.
const patches = {
  mediaRelease: {set: {public: true}},
  liveStatus: {set: {takenDown: true}},
  mediaOpsBinding: {set: {environments: ['production']}},
}

test('the form refuses every patch to a read-only document, so it writes no draft or version', async () => {
  for (const sample of samples) {
    const studio = createHarness({documents: [sample]})
    const patch = patches[sample._type as keyof typeof patches]
    await assert.rejects(
      studio.edit(sample._id, patch),
      /^Error: Attempted to patch a read-only document$/,
    )
    await assert.rejects(studio.edit(sample._id, patch, {release: 'rSpring'}), /read-only/)
    assert.deepEqual(studio.documents(), [sample], sample._id)
  }
})

test('a crafted create URL opens a form that refuses its first patch', async () => {
  // With no template, /intent/create/type=mediaRelease still opens an empty form. Its first
  // patch would create the document.
  for (const type of readOnlyTypes) {
    const studio = createHarness()
    const patch = patches[type as keyof typeof patches]
    await assert.rejects(studio.edit(`${type}.new`, patch, {type}), /read-only/, type)
    assert.deepEqual(studio.documents(), [], type)
  }
  // An editorial type's new document takes the same patch path.
  const studio = createHarness()
  const item = await studio.edit('item', {set: {title: 'Spring'}}, {type: 'mediaItem'})
  assert.equal(item._id, 'drafts.item')
  assert.equal(item.title, 'Spring')
})

test('each read-only type, and every field and array member in it, is read-only', () => {
  // Literal true, not a callback. AI Assist skips only a literal true, and paste refuses a field
  // whose own type or ancestor is read-only.
  const studio = createHarness()
  for (const type of readOnlyTypes) {
    assert.equal(studio.form(type).readOnly, true, type)
    const fields = studio.fields(type)
    assert.ok(fields.length > 0, type)
    for (const {path, readOnly} of fields) assert.equal(readOnly, true, `${type} ${path}`)
  }
})

test('AI Assist offers its inspector and field actions on media items, not on the read-only types', () => {
  const studio = createHarness()
  const assistInspector = 'ai-assistance'
  const assistFieldActions = 'sanity-assist-actions'
  assert.ok(studio.inspectors('mediaItem').includes(assistInspector))
  assert.ok(studio.fieldActions('mediaItem').includes(assistFieldActions))
  for (const type of readOnlyTypes) {
    assert.ok(!studio.inspectors(type).includes(assistInspector), type)
    assert.ok(!studio.fieldActions(type).includes(assistFieldActions), type)
  }
})

test('no pane of the desk lists or opens a read-only document', async () => {
  const drafts = samples.map((sample) => ({...sample, _id: `drafts.${sample._id}`}))
  const studio = createHarness({documents: [...samples, ...drafts]})
  const opened: string[] = []
  const walk = async (path: string[]) => {
    const pane = await studio.desk(...path)
    const where = path.join(' > ') || 'root'
    opened.push(where)
    assert.ok(!readOnlyTypes.includes(pane.schemaType ?? ''), where)
    for (const {_type} of pane.documents ?? []) assert.ok(!readOnlyTypes.includes(_type), where)
    for (const item of pane.items ?? []) await walk([...path, item.id])
  }
  await walk([])
  assert.ok(opened.includes('media > mediaItems'), 'the walk reached the Media section')
})

test('no field of any document type refers to a read-only type', () => {
  const studio = createHarness()
  const references = studio
    .documentTypes()
    .flatMap((type) =>
      studio.fields(type).map((field) => ({...field, path: `${type}.${field.path}`})),
    )
    .filter(({to}) => to)
  assert.ok(
    references.some(({path, to}) => path === 'article.author' && to?.includes('staff')),
    'the walk finds references',
  )
  for (const {path, to = []} of references) {
    for (const type of readOnlyTypes) assert.ok(!to.includes(type), `${path} refers to ${type}`)
  }
})
