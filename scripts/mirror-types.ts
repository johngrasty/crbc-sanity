// Writes mirror.types.ts, the read types for the two mirror documents, from the contract copy's
// JSON Schema. Sanity's typegen types every field as optional and never null, which fits
// Studio's form but not what media-ops writes. npm run typegen runs this after Sanity's
// typegen, and tests/mirror-types.test.ts fails when the file is out of date.
import {writeFileSync} from 'node:fs'
import process from 'node:process'
import {fileURLToPath, pathToFileURL} from 'node:url'
import * as prettier from 'prettier'
import contract from '../media-contract/schemas/media-v1.schema.json' with {type: 'json'}

export const mirrorTypesFile = fileURLToPath(new URL('../mirror.types.ts', import.meta.url))

// Each read type and the contract definition it comes from.
const readTypes = [
  ['MediaReleaseDocument', 'SanityMediaRelease'],
  ['LiveStatusDocument', 'SanityLiveStatus'],
]

type Literal = string | number | boolean | null
type Schema = {
  $ref?: string
  type?: string | string[]
  enum?: Literal[]
  const?: Literal
  properties?: Record<string, Schema>
  required?: string[]
  items?: Schema
  allOf?: Schema[]
  oneOf?: Schema[]
  anyOf?: Schema[]
  description?: string
}
const definitions = (contract as unknown as {$defs: Record<string, Schema>}).$defs

// What a schema allows, in terms TypeScript can say. unknown allows anything and never nothing.
type Property = {shape: Shape; description?: string}
type Shape =
  | {kind: 'unknown'}
  | {kind: 'never'}
  | {kind: 'scalar'; type: string}
  | {kind: 'literal'; value: Literal}
  | {kind: 'array'; items: Shape}
  | {kind: 'object'; properties: Map<string, Property>; required: Set<string>}
  | {kind: 'union'; members: Shape[]}

const unknownShape: Shape = {kind: 'unknown'}
const neverShape: Shape = {kind: 'never'}

const shapeKeywords = new Set(['$ref', 'type', 'enum', 'const', 'properties', 'required'])
const branchKeywords = new Set(['items', 'allOf', 'oneOf', 'anyOf'])
// Keywords that narrow values in ways a type can't, such as a pattern or a minimum, or that
// relate fields to each other, such as if and then. The read types leave them out. Any other
// keyword stops the script, so a schema it can't read never gives a wrong type.
const constraintKeywords = new Set([
  'description',
  'pattern',
  'format',
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'minItems',
  'maxItems',
  'not',
  'if',
  'then',
  'additionalProperties',
  'unevaluatedProperties',
])

const jsonTypes: Record<string, string> = {
  string: 'string',
  integer: 'number',
  number: 'number',
  boolean: 'boolean',
  null: 'null',
}

const literalType = (value: Literal) => (value === null ? 'null' : typeof value)
const literal = (value: Literal): Shape => ({kind: 'literal', value})

function definition(ref: string): Schema {
  const found = definitions[ref.replace('#/$defs/', '')]
  if (!found) throw new Error(`The contract has no definition ${ref}`)
  return found
}

function shapeOf(schema: Schema): Shape {
  for (const key of Object.keys(schema)) {
    if (!shapeKeywords.has(key) && !branchKeywords.has(key) && !constraintKeywords.has(key)) {
      throw new Error(`scripts/mirror-types.ts can't read the JSON Schema keyword "${key}"`)
    }
  }
  const parts = [ownShape(schema)]
  if (schema.$ref) parts.push(shapeOf(definition(schema.$ref)))
  for (const branch of schema.allOf ?? []) parts.push(shapeOf(branch))
  for (const choices of [schema.oneOf, schema.anyOf]) {
    if (choices) parts.push(union(choices.map(shapeOf)))
  }
  return parts.reduce(intersect)
}

// What this level says by itself, before $ref and the branches narrow it.
function ownShape(schema: Schema): Shape {
  if ('const' in schema) return literal(schema.const as Literal)
  const types = schema.type === undefined ? [] : [schema.type].flat()
  const typed = types.length
    ? union(
        types.map((type): Shape => {
          if (type === 'object') return objectShape(schema)
          if (type === 'array') {
            return {kind: 'array', items: schema.items ? shapeOf(schema.items) : unknownShape}
          }
          if (!jsonTypes[type]) throw new Error(`Unknown JSON type "${type}"`)
          return {kind: 'scalar', type: jsonTypes[type]}
        }),
      )
    : schema.properties
      ? objectShape(schema)
      : unknownShape
  return schema.enum ? intersect(union(schema.enum.map(literal)), typed) : typed
}

function objectShape(schema: Schema): Shape {
  const properties = new Map<string, Property>()
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    properties.set(name, {shape: shapeOf(property), description: property.description})
  }
  return {kind: 'object', properties, required: new Set(schema.required ?? [])}
}

function union(members: Shape[]): Shape {
  const flat = members.flatMap((member) => (member.kind === 'union' ? member.members : [member]))
  if (flat.some((member) => member.kind === 'unknown')) return unknownShape
  const kept = new Map<string, Shape>()
  for (const member of flat) if (member.kind !== 'never') kept.set(print(member), member)
  if (kept.size === 0) return neverShape
  return kept.size === 1 ? [...kept.values()][0] : {kind: 'union', members: [...kept.values()]}
}

// The values both shapes allow.
function intersect(a: Shape, b: Shape): Shape {
  if (a.kind === 'unknown') return b
  if (b.kind === 'unknown') return a
  if (a.kind === 'never' || b.kind === 'never') return neverShape
  if (a.kind === 'union') return union(a.members.map((member) => intersect(member, b)))
  if (b.kind === 'union') return union(b.members.map((member) => intersect(a, member)))
  if (a.kind === 'literal' && b.kind === 'literal') return a.value === b.value ? a : neverShape
  if (a.kind === 'literal' && b.kind === 'scalar') {
    return literalType(a.value) === b.type ? a : neverShape
  }
  if (a.kind === 'scalar' && b.kind === 'literal') return intersect(b, a)
  if (a.kind === 'scalar' && b.kind === 'scalar') return a.type === b.type ? a : neverShape
  if (a.kind === 'array' && b.kind === 'array') {
    return {kind: 'array', items: intersect(a.items, b.items)}
  }
  if (a.kind === 'object' && b.kind === 'object') {
    const properties = new Map(a.properties)
    for (const [name, property] of b.properties) {
      const known = properties.get(name)
      properties.set(
        name,
        known
          ? {
              shape: intersect(known.shape, property.shape),
              description: known.description ?? property.description,
            }
          : property,
      )
    }
    return {kind: 'object', properties, required: new Set([...a.required, ...b.required])}
  }
  return neverShape
}

const comment = (text?: string) => (text ? `/** ${text} */\n` : '')
const key = (name: string) => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name))

function print(shape: Shape): string {
  switch (shape.kind) {
    case 'unknown':
    case 'never':
      return shape.kind
    case 'scalar':
      return shape.type
    case 'literal':
      return JSON.stringify(shape.value)
    case 'array':
      return `Array<${print(shape.items)}>`
    case 'union':
      return shape.members.map(print).join(' | ')
    case 'object': {
      const fields = [...shape.properties].map(
        ([name, property]) =>
          `${comment(property.description)}${key(name)}${shape.required.has(name) ? '' : '?'}: ${print(property.shape)}`,
      )
      return `{\n${fields.join('\n')}\n}`
    }
  }
}

const header = `// Generated by scripts/mirror-types.ts from media-contract/schemas/media-v1.schema.json when
// npm run typegen runs. Don't edit it.
//
// The mirror documents as media-ops writes them: every field the contract requires, with its
// null states. sanity.types.ts types the same documents as Studio's form sees them, with every
// field optional and never null. Read mirror documents with these types.
`

// The text of mirror.types.ts, formatted with the repo's Prettier settings.
export async function mirrorTypes(): Promise<string> {
  const types = readTypes.map(([name, source]) => {
    const schema = definition(`#/$defs/${source}`)
    return `${comment(schema.description)}export type ${name} = ${print(shapeOf(schema))}\n`
  })
  const options = (await prettier.resolveConfig(mirrorTypesFile)) ?? {}
  return prettier.format([header, ...types].join('\n'), {...options, parser: 'typescript'})
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeFileSync(mirrorTypesFile, await mirrorTypes())
  console.log(`Wrote ${mirrorTypesFile}`)
}
