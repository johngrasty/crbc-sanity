// The test harness: the Studio built from the real registered schema and the document config
// module, over an in-memory dataset. Tests talk to this module, never to validators, inputs or
// actions directly.
import {randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {mock} from 'node:test'
import {evaluate, parse} from 'groq-js'
import speakingurl from 'speakingurl'
import type {ClientPerspective} from '@sanity/client'
import {createElement, Fragment, isValidElement, type ReactNode} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {defer, firstValueFrom} from 'rxjs'
import {studioTheme, ThemeProvider} from '@sanity/ui'
import {assist} from '@sanity/assist'
import {visionTool} from '@sanity/vision'
import {
  createMockAuthStore,
  createSearch,
  DEFAULT_MAX_RECURSION_DEPTH,
  defineField,
  definePlugin,
  defineType,
  getDraftId,
  getPublishedId,
  getSearchableTypes,
  getVersionFromId,
  getVersionId,
  isArraySchemaType,
  isDraftId,
  isObjectSchemaType,
  isPublishedId,
  isReferenceSchemaType,
  isVersionId,
  pathToString,
  prepareConfig,
  prepareForPreview,
  resolveConditionalProperty,
  resolveInitialValue,
  resolveInitialValueForType,
  validateDocument,
  type ConfigContext,
  type DocumentActionComponent,
  type DocumentActionsVersionType,
  type InputProps,
  type KeyedSegment,
  type NewDocumentCreationContext,
  type ObjectSchemaType,
  type Path,
  type PathSegment,
  type PreviewableType,
  type SanityClient,
  type SanityDocument,
  type SchemaType,
  type SlugSchemaType,
  type SlugSourceContext,
  type Source,
  type Workspace,
} from 'sanity'
import {
  createStructureBuilder,
  structureTool,
  type StructureResolverContext,
} from 'sanity/structure'
import {schemaTypes} from '../schemaTypes'
import {deskStructure} from '../structure/deskStructure'
import {duplicateWithFreshIds} from '../schemaTypes/media/duplicate'
import {editorialIdFor, idToAssign} from '../schemaTypes/media/editorialId'
import {readOnlyType} from '../schemaTypes/media/readOnlyType'
import {
  documentActions,
  formComponents,
  formFollowUps,
  newDocumentOptions,
  templates,
  versioningOptions,
  type DocumentPatch,
  type FormFollowUp,
} from '../structure/documentConfig'
import {followUpPatch} from '../structure/FormFollowUpInput'
import {parsePatchPath} from '../structure/patchPath'

export type {FormFollowUp}

export type TestDocument = {_id: string; _type: string} & Record<string, unknown>

// A validation marker. path is in Sanity's string form, for example passages[_key=="a"].book,
// and is empty for a document-level rule.
export type Marker = {path: string; level: 'error' | 'warning' | 'info'; message: string}

// What a document's preview shows in desk lists, search and reference fields. media is the
// selected value, such as an image. When the media is a React element instead, such as a
// speaker's initials, mediaText is the text it renders. Without either, Studio shows the type's
// icon.
export type Preview = {
  title?: string
  subtitle?: string
  description?: string
  media?: unknown
  mediaText?: string
}

// A pane of the desk. A list has items, a document list has the documents it shows, and a
// document pane has its fixed document and the value its form starts from while that document
// doesn't exist. Other panes, such as components, have only a type.
export type DeskPane = {
  type: string
  title?: string
  items?: {id: string; title?: string}[]
  documents?: TestDocument[]
  documentId?: string
  schemaType?: string
  initialValue?: TestDocument
}

// The document an intent URL opens. path is the router's pane IDs: desk item IDs, or
// __edit__<id> when Studio opens its plain editor outside the desk. initialValue is what the
// form starts from while the document doesn't exist.
export type IntentPane = {
  path: string[]
  documentId: string
  schemaType: string
  initialValue?: TestDocument
}

// The client behind the mock auth store. Sanity needs config().url to build a Source. Nothing
// should query it: the harness's own client answers from the dataset.
const sourceClient = {
  config: () => ({
    projectId: 'test',
    dataset: 'test',
    apiVersion: '2025-02-19',
    url: 'https://test.api.sanity.io/v2025-02-19',
  }),
  withConfig: () => sourceClient,
  fetch: async () => {
    throw new Error('Query the dataset through the harness client, not the Source client')
  },
  observable: {},
}

// A document type only the harness registers, never the Studio, and it has no template, so no
// create menu offers it. Its rule queries through ValidationContext.getClient, as Studio's rules
// do, and reports the media item _id values it saw as an info marker. tests/harness-client.test.ts
// uses it to pin what the harness client shows at each API version and perspective.
const clientProbe = defineType({
  name: 'harnessClientProbe',
  type: 'document',
  fields: [
    defineField({
      name: 'query',
      type: 'object',
      fields: [
        defineField({name: 'apiVersion', type: 'string'}),
        defineField({name: 'perspective', type: 'string'}),
      ],
      validation: (rule) =>
        rule
          .custom(async (value, context) => {
            if (!value) return true
            const {apiVersion, perspective} = value as {
              apiVersion: string
              perspective?: ClientPerspective
            }
            const client = context.getClient({apiVersion})
            const scoped = perspective ? client.withConfig({perspective}) : client
            return JSON.stringify(await scoped.fetch('*[_type == "mediaItem"] | order(_id)._id'))
          })
          .info(),
    }),
  ],
})

// One probe type for each kind of action flags, for the form lock's tests: none, which enables
// every action, an empty list, only create and only update.
const actionProbes = (
  [
    ['harnessActionsDefault', undefined],
    ['harnessActionsNone', []],
    ['harnessActionsCreate', ['create']],
    ['harnessActionsUpdate', ['update']],
  ] as const
).map(([name, actions]) => ({
  ...defineType({name, type: 'document', fields: [defineField({name: 'title', type: 'string'})]}),
  ...(actions && {__experimental_actions: [...actions]}),
}))

// A type wrapped in readOnlyType with a document rule and an input of its own, for the tests
// that readOnlyType keeps both.
const readOnlyProbe = readOnlyType(
  'The harness',
  defineType({
    name: 'harnessReadOnlyProbe',
    type: 'document',
    fields: [defineField({name: 'title', type: 'string'})],
    validation: (rule) => rule.custom(() => 'The probe rule ran.'),
    components: {
      input: (props: InputProps) =>
        createElement(
          Fragment,
          null,
          createElement('p', null, "The probe input's own text."),
          props.renderDefault(props),
        ),
    },
  }),
)

// The harness's own types have no template, so no create menu or create call offers them.
const probeTypes = new Set<string>(
  [clientProbe, ...actionProbes, readOnlyProbe].map(({name}) => name),
)

// Sanity's own config resolution, with the plugins sanity.config.ts uses. sanity-plugin-media
// can't load in Node, so an inert plugin stands in for it. It adds no document actions,
// templates or create-menu options. Keep this list in step with sanity.config.ts.
const prepared = prepareConfig({
  name: 'default',
  projectId: 'test',
  dataset: 'test',
  auth: createMockAuthStore({
    client: sourceClient as unknown as SanityClient,
    currentUser: {
      id: 'editor',
      name: 'Editor',
      email: 'editor@example.com',
      role: 'administrator',
      roles: [{name: 'administrator', title: 'Administrator'}],
    },
  }),
  plugins: [
    structureTool({structure: deskStructure}),
    visionTool(),
    definePlugin({name: 'media'})(),
    assist(),
  ],
  schema: {
    types: [...schemaTypes, clientProbe, ...actionProbes, readOnlyProbe],
    templates: (prev, context) =>
      templates(prev, context).filter(({schemaType}) => !probeTypes.has(schemaType)),
  },
  form: {components: formComponents},
  ...versioningOptions,
  document: {actions: documentActions, newDocumentOptions},
})

// Sanity reads window when a Source resolves, and its validator and initial values schedule
// work through window.setTimeout. window must not exist while sanity loads or while
// prepareConfig runs, so it's installed here, after both. An EventTarget accepts Sanity's
// event listeners, and the WebSocket stub fails loudly if anything tries to connect.
Object.assign(globalThis, {
  window: Object.assign(new EventTarget(), {
    setTimeout,
    clearTimeout,
    WebSocket: class {
      constructor() {
        throw new Error('The harness has no network')
      }
    },
  }),
})

const source = await new Promise<Source>((resolve, reject) =>
  prepared.workspaces[0].__internal.sources[0].source.subscribe({next: resolve, error: reject}),
)
const schema = source.schema

// The desk, built by Sanity's structure builder from the same Source, as the structure tool
// builds it.
type Ordering = {field: string; direction: 'asc' | 'desc'}
type StructureNode = {
  type: string
  id?: string
  title?: string
  items?: StructureNode[]
  child?: unknown
  schemaTypeName?: string
  canHandleIntent?: (
    intent: string,
    params: Record<string, unknown>,
    context: {pane: StructureNode; index: number},
  ) => boolean
  options?: {
    filter?: string
    params?: Record<string, unknown>
    defaultOrdering?: Ordering[]
    id?: string
    type?: string
    template?: string
    templateParameters?: Record<string, unknown>
  }
}
const structureBuilder = createStructureBuilder({source, perspectiveStack: []})
const structureContext = {...source, perspectiveStack: []} as unknown as StructureResolverContext
const serializeNode = (node: unknown): StructureNode => {
  const builder = node as {serialize?: () => StructureNode}
  return typeof builder.serialize === 'function' ? builder.serialize() : (node as StructureNode)
}
// A list's own child resolver finds the item through its parent, so pass the list as parent.
async function openChild(
  child: unknown,
  id: string,
  path: string[],
  parent: StructureNode | null = null,
): Promise<StructureNode> {
  if (typeof child !== 'function') return serializeNode(child)
  return serializeNode(await child(id, {index: 0, splitIndex: 0, path, params: {}, parent}))
}

// The text a React node renders. Function components are called directly, so a preview's media
// component mustn't use hooks.
function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (!isValidElement<{children?: ReactNode}>(node)) return ''
  const {type, props} = node
  return textOf(
    typeof type === 'function' ? (type as (props: unknown) => ReactNode)(props) : props.children,
  )
}

// A reference, as Sanity tells one apart: an object with a string _ref.
const isReferenceValue = (value: unknown): value is {_ref: string; _weak?: unknown} =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as {_ref?: unknown})._ref === 'string'

// What Sanity's publish writes for a value. A reference picked while its document was
// unpublished carries _weak and _strengthenOnPublish. Publishing drops _strengthenOnPublish, and
// drops _weak too unless the field is weak, which the marker records (lib/index.js:5611-5613).
// Other references stay as they are.
function strengthenOnPublish(value: unknown): unknown {
  if (isReferenceValue(value)) {
    const {_strengthenOnPublish: marker, ...rest} = value as Record<string, unknown>
    if (!marker) return value
    if ((marker as {weak?: unknown}).weak) return rest
    const {_weak: _dropped, ...strong} = rest
    return strong
  }
  if (Array.isArray(value)) return value.map(strengthenOnPublish)
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, strengthenOnPublish(child)]),
  )
}

// The _ref of every strong reference in a value, at any depth: every reference without _weak.
function strongReferences(value: unknown): string[] {
  if (isReferenceValue(value)) return value._weak === true ? [] : [value._ref]
  if (Array.isArray(value)) return value.flatMap(strongReferences)
  if (typeof value !== 'object' || value === null) return []
  return Object.values(value).flatMap(strongReferences)
}

const actionName = (action: DocumentActionComponent) =>
  action.action ?? action.displayName ?? action.name

// The value a document form shows: a stored document, or the initial value of one nothing
// stores yet, which may have no _id.
export type FormValue = {_id?: string; _type: string} & Record<string, unknown>

// Whether a type's action flags lock Studio's document form, so that every patch throws
// "Attempted to patch a read-only document" and sends nothing. The form needs update enabled
// whatever it shows, and create as well while the value it shows has no _id
// (lib/index.js:58356, with the throwing handler at 58498). A type without
// __experimental_actions enables every action, as isActionEnabled in @sanity/schema/_internal
// decides (lib/_internal.js:504-519). That package isn't a Studio dependency, so this copies
// it. This is only the action flags' part of the lock. The form also locks while it loads,
// without permission, in the published perspective, and for a release the document isn't in.
// The harness models those only where a call says so.
function actionsLockForm(type: SchemaType, shown: FormValue): boolean {
  const flags = '__experimental_actions' in type ? type.__experimental_actions : undefined
  const enabled = (action: 'create' | 'update') => flags === undefined || flags.includes(action)
  return !enabled('update') || (!shown._id && !enabled('create'))
}

// The text a document type's own input shows above the fields. The harness can't mount
// Studio's form, so it renders the type's components.input to static HTML, inside the theme
// Studio provides, with the fields Sanity renders through renderDefault stubbed out.
const entities: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', '#x27': "'"}
function formNotice(schemaType: SchemaType): string | undefined {
  const Input = schemaType.components?.input
  if (!Input) return undefined
  const fields = '[fields]'
  const props = {schemaType, readOnly: true, renderDefault: () => fields} as unknown as InputProps
  const html = renderToStaticMarkup(
    createElement(ThemeProvider, {theme: studioTheme}, createElement(Input, props)),
  )
  if (!html.includes(fields))
    throw new Error(`The ${schemaType.name} input doesn't render its fields`)
  const text = html
    .slice(0, html.indexOf(fields))
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#x27);/g, (_: string, entity: string) => entities[entity])
    .replace(/\s+/g, ' ')
    .trim()
  return text || undefined
}

// The document types global search covers, as Sanity selects them. The type filter, recent
// searches and the release tool's "Add document" use the same list. getSearchableTypes is
// Sanity's export, and the omnisearch flag filter copies getSearchableOmnisearchTypes, which
// isn't exported (lib/index.js:50487-50489).
const globalSearchTypes = (): string[] =>
  getSearchableTypes(schema)
    .filter((type) => type.__experimental_omnisearch_visibility !== false)
    .map(({name}) => name)

// A field a type declares, at any depth, as Sanity compiled it. path is dotted, with [] for an
// array's members, for example captions[].label. readOnly is the declared value, so a callback
// stays a function. A reference lists the types it can point to, and a field with options.list
// lists the values it offers.
export type SchemaField = {
  path: string
  jsonType: string
  readOnly: unknown
  to?: string[]
  list?: unknown[]
}

// The values of an options.list, whether written as {title, value} or as bare values.
const listValues = (list: unknown[]) =>
  list.map((option) =>
    option && typeof option === 'object' && 'value' in option ? option.value : option,
  )

// Walks a compiled type's fields and array members. Names that start with _, such as a
// reference's _ref, are Sanity's own. A type already open higher up the path isn't walked again,
// so a type that contains itself ends.
function declaredFields(type: SchemaType, prefix = '', open = new Set<SchemaType>()) {
  const found: SchemaField[] = []
  if (open.has(type)) return found
  open = new Set(open).add(type)
  const add = (path: string, member: SchemaType) => {
    const field: SchemaField = {path, jsonType: member.jsonType, readOnly: member.readOnly}
    if (isReferenceSchemaType(member)) field.to = member.to.map(({name}) => name)
    const list = (member.options as {list?: unknown} | undefined)?.list
    if (Array.isArray(list)) field.list = listValues(list)
    found.push(field, ...declaredFields(member, path, open))
  }
  if (isObjectSchemaType(type)) {
    for (const {name, type: member} of type.fields) {
      if (!name.startsWith('_')) add(prefix ? `${prefix}.${name}` : name, member)
    }
  }
  if (isArraySchemaType(type)) {
    for (const member of type.of) add(`${prefix}[]`, member)
  }
  return found
}

// One document action as Studio resolves it. action is the name Sanity copies into the action's
// state, component is the component's displayName or function name, and keptWhenLinkedToCanvas
// says whether Sanity's Canvas guard leaves it enabled on a document linked to Canvas.
export type ActionDetail = {
  action: string | undefined
  component: string
  keptWhenLinkedToCanvas: boolean
}

// On a document linked to Canvas, Sanity's ActionsGuardWrapper disables every action whose state
// has no action name, or a name off its list (sanity/lib/_chunks-es/pane.js:1914-1934). The
// guard isn't exported, so the harness reads its list from the installed file and stops if the
// guard's test no longer reads as it does here.
const paneChunk = readFileSync(
  new URL('./_chunks-es/pane.js', import.meta.resolve('sanity')),
  'utf8',
)
const canvasList = /const SUPPORTED_LINKED_TO_CANVAS_ACTIONS = (\[[^\]]*\]);/.exec(paneChunk)
const canvasTest =
  'states.map((s) => !s.action || !SUPPORTED_LINKED_TO_CANVAS_ACTIONS.includes(s.action) ? {'
if (!canvasList || !paneChunk.includes(canvasTest)) {
  throw new Error(
    "Sanity's Canvas guard changed. Read ActionsGuardWrapper in sanity/lib/_chunks-es/pane.js and update the harness.",
  )
}
const canvasActions: string[] = JSON.parse(canvasList[1])

const actionDetail = (action: DocumentActionComponent): ActionDetail => ({
  action: action.action,
  component: action.displayName ?? action.name,
  keptWhenLinkedToCanvas: Boolean(action.action && canvasActions.includes(action.action)),
})

type Container = Record<string, unknown> | unknown[]

// The array index a path segment names, or -1 when there's no such item. Only an index or a
// {_key} names one.
function indexIn(items: unknown[], segment: PathSegment): number {
  if (typeof segment === 'number') return segment
  if (!segment || typeof segment !== 'object' || Array.isArray(segment)) return -1
  const {_key} = segment as KeyedSegment
  return items.findIndex((item) => (item as {_key?: unknown} | null)?._key === _key)
}

// The value holding a path's last segment. A set creates missing objects on the way, as Sanity
// does. A keyed segment needs its item to exist, as in Sanity, where a set or unset on a missing
// item changes nothing.
function parentAt(document: TestDocument, path: Path, create: boolean): Container | undefined {
  let target: unknown = document
  for (const segment of path.slice(0, -1)) {
    if (Array.isArray(target)) {
      target = target[indexIn(target, segment)]
    } else if (target && typeof target === 'object' && typeof segment === 'string') {
      const object = target as Record<string, unknown>
      if (create) object[segment] ??= {}
      target = object[segment]
    } else {
      return undefined
    }
  }
  return target && typeof target === 'object' ? (target as Container) : undefined
}

// Applies set, then unset, as Sanity does. Paths are in Sanity's string form, such as title,
// editorHold.note or passages[_key=="a"].display.
function applyPatch(document: TestDocument, {set = {}, unset = []}: DocumentPatch): TestDocument {
  const next = structuredClone(document)
  for (const [path, value] of Object.entries(set)) {
    const segments = parsePatchPath(path)
    const last = segments[segments.length - 1]
    const parent = parentAt(next, segments, true)
    if (Array.isArray(parent)) {
      const index = indexIn(parent, last)
      if (index >= 0) parent[index] = structuredClone(value)
    } else if (parent && typeof last === 'string') {
      parent[last] = structuredClone(value)
    }
  }
  for (const path of unset) {
    const segments = parsePatchPath(path)
    const last = segments[segments.length - 1]
    const parent = parentAt(next, segments, false)
    if (Array.isArray(parent)) {
      const index = indexIn(parent, last)
      if (index >= 0) parent.splice(index, 1)
    } else if (parent && typeof last === 'string') {
      delete parent[last]
    }
  }
  return next
}

// The paths in written of objects and arrays that are source's own objects, not copies, in
// Sanity's path form, such as requestedDestinations[0]. The document itself is ''.
function sharedObjects(source: object, written: unknown): string[] {
  const own = new Set<unknown>()
  const collect = (value: unknown) => {
    if (!value || typeof value !== 'object' || own.has(value)) return
    own.add(value)
    Object.values(value).forEach(collect)
  }
  collect(source)
  const shared: string[] = []
  const walk = (value: unknown, path: (string | number)[]) => {
    if (!value || typeof value !== 'object') return
    if (own.has(value)) shared.push(pathToString(path))
    for (const [key, child] of Object.entries(value)) {
      walk(child, [...path, Array.isArray(value) ? Number(key) : key])
    }
  }
  walk(written, [])
  return shared
}

type ClientConfig = {apiVersion?: string; perspective?: unknown}

// API version 2025-02-19 brought content releases. From then on Content Lake's default
// perspective is published, and raw includes release versions. Before it, the default is raw,
// and even raw leaves out versions.* documents. vX is the newest version.
const hasReleases = (apiVersion = '1') => {
  const version = apiVersion.replace(/^v/, '')
  return version === 'X' || version >= '2025-02-19'
}

// What a perspective stack such as ['drafts'] or ['rSpring', 'drafts'] shows, as Content Lake
// does: each document once, as its first version the stack names, falling back to the published
// document. It goes by its published _id, and _originalId is the _id of the version shown. A
// release outside the stack, and a draft when the stack leaves out drafts, don't show.
function overlay(documents: TestDocument[], stack: string[]): TestDocument[] {
  const byId = new Map(documents.map((document) => [document._id, document]))
  const publishedIds = new Set(documents.map(({_id}) => getPublishedId(_id)))
  const layerId = (id: string, layer: string) =>
    layer === 'published' ? id : layer === 'drafts' ? getDraftId(id) : getVersionId(id, layer)
  return [...publishedIds].flatMap((id) => {
    const shown = [...stack, 'published'].map((layer) => byId.get(layerId(id, layer))).find(Boolean)
    if (!shown) return []
    if ((shown._system as {delete?: boolean} | undefined)?.delete === true) {
      throw new Error("The test client doesn't model a release version that deletes its document")
    }
    return [{...shown, _id: id, _originalId: shown._id}]
  })
}

// A perspective as a stack, or undefined for raw and published, which show stored documents.
// Content Lake takes drafts and stacks from API version 2025-02-19. The client refuses anything
// else it can't model: previewDrafts, the older name for drafts, raw inside a stack, or an empty
// release name.
function perspectiveStack(perspective: unknown, releases: boolean): string[] | undefined {
  if (perspective === 'raw' || perspective === 'published') return undefined
  const stack = perspective === 'drafts' ? ['drafts'] : perspective
  const unsupported = () =>
    new Error(`The test client doesn't support the ${JSON.stringify(perspective)} perspective`)
  if (!Array.isArray(stack) || !releases) throw unsupported()
  for (const layer of stack) {
    if (typeof layer !== 'string' || !layer || ['raw', 'previewDrafts'].includes(layer)) {
      throw unsupported()
    }
  }
  return stack
}

// A Sanity client over the in-memory dataset that answers queries with groq-js. It sees what
// Content Lake would show at its API version, so a rule that forgets to ask for raw, or asks an
// API version older than releases, misses documents here too. Add methods as Studio code needs
// them.
function testClient(dataset: Map<string, TestDocument>, config: ClientConfig): SanityClient {
  const releases = hasReleases(config.apiVersion)
  const perspective = config.perspective ?? (releases ? 'published' : 'raw')
  const stack = perspectiveStack(perspective, releases)
  const visible = () => {
    const documents = [...dataset.values()]
    if (stack) return overlay(documents, stack)
    if (perspective === 'raw')
      return releases ? documents : documents.filter(({_id}) => !isVersionId(_id))
    return documents.filter(({_id}) => !isDraftId(_id) && !isVersionId(_id))
  }
  const client = {
    config: () => ({projectId: 'test', dataset: 'test', ...config, perspective}),
    withConfig: (next: ClientConfig) => testClient(dataset, {...config, ...next}),
    clone: () => testClient(dataset, config),
    async fetch(query: string, params: Record<string, unknown> = {}) {
      const result = await evaluate(parse(query, {params}), {dataset: visible(), params})
      return structuredClone(await result.get())
    },
    // Studio's search fetches through the observable client. A perspective in the options
    // overrides the client's, as in @sanity/client.
    observable: {
      fetch: (query: string, params?: Record<string, unknown>, options?: {perspective?: unknown}) =>
        defer(() =>
          (options?.perspective === undefined
            ? client
            : testClient(dataset, {...config, perspective: options.perspective})
          ).fetch(query, params),
        ),
    },
    // Like Content Lake's create mutation, it fails when the _id is taken, sets the system
    // fields, and returns the stored document.
    async create(document: TestDocument) {
      if (dataset.has(document._id)) {
        throw new Error(`A document with _id "${document._id}" already exists`)
      }
      const now = new Date().toISOString()
      const created = {...document, _rev: randomUUID(), _createdAt: now, _updatedAt: now}
      dataset.set(created._id, structuredClone(created))
      return structuredClone(created)
    },
  }
  return client as unknown as SanityClient
}

// documents seeds the dataset. Give each its full _id: item, drafts.item or
// versions.<release>.item. now fixes the clock, as an ISO instant, for create and desk: templates
// read it as the moment of creation, and desk lists read it as GROQ's now(). Without it, both use
// the real clock. followUps adds form follow-up steps after the ones documentConfig.ts registers,
// as a later ticket would register them there.
export function createHarness({
  documents = [],
  now,
  followUps = {},
}: {documents?: TestDocument[]; now?: string; followUps?: Record<string, FormFollowUp[]>} = {}) {
  const dataset = new Map<string, TestDocument>()
  const fixedNow = now === undefined ? undefined : Date.parse(now)
  if (fixedNow !== undefined && Number.isNaN(fixedNow)) throw new Error(`now isn't an instant`)
  const followUpSteps = (type: string) => [
    ...(formFollowUps[type] ?? []),
    ...(followUps[type] ?? []),
  ]

  // Runs work with Date set to the fixed clock, when there is one.
  async function atNow<T>(work: () => Promise<T>): Promise<T> {
    if (fixedNow === undefined) return work()
    mock.timers.enable({apis: ['Date'], now: fixedNow})
    try {
      return await work()
    } finally {
      mock.timers.reset()
    }
  }

  const getClient = (config: ClientConfig) => testClient(dataset, config)
  const configContext = {
    projectId: 'test',
    dataset: 'test',
    schema,
    currentUser: null,
    getClient,
  } as unknown as ConfigContext

  const store = (document: TestDocument) => dataset.set(document._id, structuredClone(document))
  documents.forEach(store)
  const touch = (document: TestDocument): TestDocument => ({
    ...document,
    _rev: randomUUID(),
    _updatedAt: new Date().toISOString(),
  })

  // Whether a referenced document exists, as Studio's validation sees it from a document in this
  // release, or outside any release: when it's published. For a document in a release, the
  // referenced document's version in that release decides first: a version the release deletes,
  // with _system.delete, doesn't exist, and any other version does. Validation reads the published
  // ID of whatever ID it's given. publish also requires the reference to name a published ID.
  const referenceExists = (id: string, release?: string) => {
    const version = release === undefined ? undefined : dataset.get(getVersionId(id, release))
    if (version) return (version._system as {delete?: boolean} | undefined)?.delete !== true
    return dataset.has(getPublishedId(id))
  }

  // Runs Sanity's own validateDocument, as Studio does in the form, against the dataset.
  // Takes a document, or the _id of one in the dataset.
  async function validate(document: TestDocument | string): Promise<Marker[]> {
    const value = typeof document === 'string' ? dataset.get(document) : document
    if (!value) throw new Error(`No document with _id "${document}"`)
    // Sanity skips a type the schema doesn't have and returns no markers, which would pass.
    if (!schema.get(value._type)) throw new Error(`No schema type named "${value._type}"`)
    // Without i18n on the workspace, Sanity falls back to its English messages.
    const workspace = {schema, getClient} as unknown as Workspace
    const release = getVersionFromId(value._id)
    const markers = await validateDocument({
      document: value as SanityDocument,
      workspace,
      getDocumentExists: async ({id}) => referenceExists(id, release),
      environment: 'studio',
    })
    return markers.map(({path, level, message}) => ({path: pathToString(path), level, message}))
  }

  // The value a document pane's form starts from while its document doesn't exist, as Sanity
  // resolves it: the pane's template, else the type's only template. With neither, the form
  // starts with just _id and _type, and field initial values don't apply. Once the draft or the
  // published document exists, the form shows it instead and this is undefined. See
  // lib/_chunks-es/pane.js:7223 and lib/index.js:7286-7305.
  async function paneInitialValue(
    documentId: string,
    schemaType: string,
    {template, templateParameters}: {template?: string; templateParameters?: object},
  ): Promise<TestDocument | undefined> {
    if (dataset.has(getPublishedId(documentId)) || dataset.has(getDraftId(documentId))) return
    const empty = {_id: documentId, _type: schemaType}
    const typeTemplates = source.templates.filter(
      (candidate) => candidate.schemaType === schemaType,
    )
    const templateId = template ?? (typeTemplates.length === 1 ? typeTemplates[0].id : undefined)
    const found = source.templates.find(({id}) => id === templateId)
    if (!found) return empty
    return {
      ...empty,
      ...(await resolveInitialValue(schema, found, templateParameters, configContext)),
    }
  }

  const versionId = (id: string, release?: string) =>
    release ? getVersionId(getPublishedId(id), release) : getDraftId(getPublishedId(id))

  let lastShared: string[] = []

  const resolveActions = (
    type: string,
    versionType: DocumentActionsVersionType,
    documentId: string | undefined,
  ) => {
    const inRelease = versionType === 'version' || versionType === 'scheduled-draft'
    return source.document.actions({
      schemaType: type,
      documentId,
      versionType,
      releaseId: inRelease ? 'rHarness' : undefined,
    })
  }

  return {
    validate,

    // The names of the document actions Studio's document pane shows for this type, resolved
    // through the whole plugin chain. Unnamed actions show their displayName. A replacement
    // that sets a built-in's action name shows that name, so use actionDetails to tell the two
    // apart. A version or a scheduled draft belongs to the release rHarness. documentId is the
    // published ID the pane passes, and defaults to the type name, a singleton's fixed ID. Pass
    // null to resolve with no document ID, which Sanity's context allows.
    actions(
      type: string,
      versionType: DocumentActionsVersionType,
      {documentId = type}: {documentId?: string | null} = {},
    ): string[] {
      return resolveActions(type, versionType, documentId ?? undefined).map(actionName)
    },

    // The same actions, each with its action name, its component and what Sanity's Canvas guard
    // does with it.
    actionDetails(
      type: string,
      versionType: DocumentActionsVersionType,
      {documentId = type}: {documentId?: string | null} = {},
    ): ActionDetail[] {
      return resolveActions(type, versionType, documentId ?? undefined).map(actionDetail)
    },

    // What Studio reads from a registered document type, or undefined for a type the schema
    // doesn't have. liveEdit means edits skip the draft and go straight to the published
    // document. A field is assistExcluded when its options set aiAssist.exclude, which AI Assist
    // checks before it offers or writes the field (@sanity/assist/dist/index.js:235).
    schemaType(
      name: string,
    ): {liveEdit: boolean; fields: {name: string; assistExcluded: boolean}[]} | undefined {
      const type = schema.get(name) as (ObjectSchemaType & {liveEdit?: boolean}) | undefined
      if (!type) return undefined
      return {
        liveEdit: type.liveEdit === true,
        fields: type.fields.map((field) => {
          const options = field.type.options as {aiAssist?: {exclude?: boolean}} | undefined
          return {name: field.name, assistExcluded: options?.aiAssist?.exclude === true}
        }),
      }
    },

    // Whether the workspace turns on Content Releases and scheduled drafts, as the resolved
    // Source has them, and whether it loads the releases tool. Sanity loads the releases plugin
    // only while releases are on, and the releases tool while either is
    // (lib/index.js:78134-78135). Both are on unless the config turns them off.
    versioning(): {releases: boolean; scheduledDrafts: boolean; releasesTool: boolean} {
      return {
        releases: source.releases?.enabled ?? true,
        scheduledDrafts: source.scheduledDrafts?.enabled ?? true,
        // The tool's name in Sanity's schedules plugin, SCHEDULES_TOOL_NAME. Version chips open
        // their right-click menu only while it's loaded.
        releasesTool: source.tools.some(({name}) => name === 'releases'),
      }
    },

    // The document types global search covers. See globalSearchTypes.
    searchTypes: globalSearchTypes,

    // The document form for a type. readOnly is the type's own declared value, which locks every
    // input in the form. notice is the text the type's own input shows above the fields, or
    // undefined when it shows none.
    form(type: string): {readOnly: unknown; notice?: string} {
      const schemaType = schema.get(type)
      if (!schemaType) throw new Error(`No schema type named "${type}"`)
      return {readOnly: schemaType.readOnly, notice: formNotice(schemaType)}
    },

    // The names of the top-level fields a document's form hides, in field order. Takes a
    // document, or the _id of one in the dataset. Each field's hidden callback gets the document
    // as its parent, as Sanity's form gives it (lib/index.js:57543-57575).
    hiddenFields(document: TestDocument | string): string[] {
      const value = typeof document === 'string' ? dataset.get(document) : document
      if (!value) throw new Error(`No document with _id "${document}"`)
      const schemaType = schema.get(value._type) as ObjectSchemaType | undefined
      if (!schemaType) throw new Error(`No schema type named "${value._type}"`)
      return schemaType.fields
        .filter(({name, type}) =>
          resolveConditionalProperty(type.hidden, {
            document: value as SanityDocument,
            parent: value,
            value: value[name],
            currentUser: null,
          }),
        )
        .map(({name}) => name)
    },

    // The names of every registered document type, plugin types included.
    documentTypes(): string[] {
      return schema
        .getTypeNames()
        .filter((name) => schema.get(name)?.type?.name === 'document')
        .sort()
    },

    // Every field the registered type declares, at any depth. See SchemaField.
    fields(type: string): SchemaField[] {
      const schemaType = schema.get(type)
      if (!schemaType) throw new Error(`No schema type named "${type}"`)
      return declaredFields(schemaType)
    },

    // The names of the inspectors a document pane offers for this type, such as AI Assist's
    // ai-assistance, resolved through the whole plugin chain.
    inspectors(type: string): string[] {
      return source.document
        .inspectors({documentId: type, documentType: type})
        .map(({name}) => name)
    },

    // The names of the field actions each field in this type's form offers, such as Sanity's
    // copyField and pasteField and AI Assist's sanity-assist-actions, resolved through the whole
    // plugin chain.
    fieldActions(type: string): string[] {
      const schemaType = schema.get(type)
      if (!schemaType) throw new Error(`No schema type named "${type}"`)
      return source.document
        .unstable_fieldActions({documentId: type, documentType: type, schemaType})
        .map(({name}) => name)
    },

    // The template IDs a create menu offers, resolved through the whole config chain: the
    // global create button by default, a structure list's "+" with {type: 'structure',
    // schemaType}, or a reference field's "Create new" with {type: 'document', documentId,
    // schemaType}. A reference field then keeps only the templates of the types it refers to.
    createMenu(context: NewDocumentCreationContext = {type: 'global'}): string[] {
      return source.document.resolveNewDocumentOptions(context).map(({templateId}) => templateId)
    },

    // The templates of a type, in the Source's order, with the titles create menus show.
    templates(schemaType: string): {id: string; title: string}[] {
      return source.templates
        .filter((template) => template.schemaType === schemaType)
        .map(({id, title}) => ({id, title}))
    },

    // A new document from a template, stored as a draft, as Studio stores it on the first edit.
    async create(templateId: string, params?: Record<string, unknown>): Promise<TestDocument> {
      const template = source.templates.find(({id}) => id === templateId)
      if (!template) throw new Error(`No template named "${templateId}"`)
      return atNow(async () => {
        const value = await resolveInitialValue(schema, template, params, configContext)
        const document = touch({
          ...value,
          _id: `drafts.${randomUUID()}`,
          _type: template.schemaType,
          _createdAt: new Date().toISOString(),
        })
        store(document)
        return structuredClone(document)
      })
    },

    // Patches the draft, or with release the version in that release, as an editor's form edit
    // does. A missing version starts from the published document, or for a release from the
    // draft when nothing is published. When nothing is stored at all, the first patch starts
    // from initialValue, what the form shows, such as intent()'s initialValue for a create URL.
    // Like the form, edit refuses a patch while the type's action flags lock it. Then
    // the form applies the type's follow-up steps, with the version as it was before the patch
    // and the stored draft.
    async edit(
      id: string,
      patch: DocumentPatch,
      {release, initialValue}: {release?: string; initialValue?: FormValue} = {},
    ): Promise<TestDocument> {
      const publishedId = getPublishedId(id)
      const target = versionId(id, release)
      const published = dataset.get(publishedId) ?? null
      const draft = dataset.get(getDraftId(publishedId)) ?? null
      const base = dataset.get(target) ?? published ?? (release ? draft : null)
      const shown = base ?? initialValue
      if (!shown) throw new Error(`No document to edit with _id "${publishedId}"`)
      const schemaType = schema.get(shown._type)
      if (schemaType && actionsLockForm(schemaType, shown)) {
        throw new Error('Attempted to patch a read-only document')
      }
      const previous: TestDocument = {...shown, _id: target}
      let version = applyPatch(previous, patch)
      const followUp = followUpPatch(followUpSteps(version._type), {
        previous,
        version,
        published,
        draft,
      })
      if (followUp) version = applyPatch(version, followUp)
      store(touch(version))
      return structuredClone(dataset.get(target) as TestDocument)
    },

    // Opens the document's form, as an editor does, and returns the document it shows. Without
    // release the form shows the draft, else the published document. With release it shows that
    // release's version, else the draft or the published document, and then it's read-only. It's
    // read-only too when the type's action flags lock the form. Once loaded, the
    // form applies the type's follow-up steps unless it's read-only. Like Sanity, a patch on the
    // published document writes a draft made from it.
    async open(id: string, {release}: {release?: string} = {}): Promise<TestDocument> {
      const publishedId = getPublishedId(id)
      const published = dataset.get(publishedId) ?? null
      const version = release ? dataset.get(getVersionId(publishedId, release)) : undefined
      const shown = version ?? dataset.get(getDraftId(publishedId)) ?? published
      if (!shown) throw new Error(`No document to open with _id "${publishedId}"`)
      const schemaType = schema.get(shown._type)
      const locked = schemaType !== undefined && actionsLockForm(schemaType, shown)
      const readOnly = (release !== undefined && !version) || locked
      const followUp = followUpPatch(followUpSteps(shown._type), {
        previous: shown,
        version: shown,
        published,
        draft: dataset.get(getDraftId(publishedId)) ?? null,
        readOnly,
      })
      if (!followUp) return structuredClone(shown)
      const target = isPublishedId(shown._id) ? getDraftId(publishedId) : shown._id
      store(touch(applyPatch({...shown, _id: target}, followUp)))
      return structuredClone(dataset.get(target) as TestDocument)
    },

    // The item an array field's "Add item" inserts, as the form builds it: a _type and a fresh
    // _key, then the member type's initial values. Name memberType when the array holds more
    // than one type. Nothing is stored.
    async newArrayItem(
      documentType: string,
      field: string,
      memberType?: string,
    ): Promise<Record<string, unknown>> {
      const fieldType = (schema.get(documentType) as ObjectSchemaType | undefined)?.fields.find(
        ({name}) => name === field,
      )?.type
      if (!fieldType || !isArraySchemaType(fieldType)) {
        throw new Error(`${documentType} has no array field "${field}"`)
      }
      const member = memberType
        ? fieldType.of.find(({name}) => name === memberType)
        : fieldType.of.length === 1
          ? fieldType.of[0]
          : undefined
      if (!member) throw new Error(`Name one of the member types of ${documentType}.${field}`)
      const item = {_type: member.name, _key: randomUUID().slice(0, 12).replace('-', '')}
      const initial = await resolveInitialValueForType(
        member,
        item,
        DEFAULT_MAX_RECURSION_DEPTH,
        configContext,
      )
      return structuredClone({...item, ...(initial as object)})
    },

    // The slug a slug field's Generate button makes, as Sanity's slug input makes it: the field's
    // source run through its slugify, or through speakingurl when it has none. Takes a document,
    // or the _id of one in the dataset. Nothing is stored.
    async generateSlug(
      document: TestDocument | string,
      field = 'slug',
    ): Promise<string | undefined> {
      const value = typeof document === 'string' ? dataset.get(document) : document
      if (!value) throw new Error(`No document with _id "${document}"`)
      const slugType = (schema.get(value._type) as ObjectSchemaType | undefined)?.fields.find(
        ({name}) => name === field,
      )?.type as SlugSchemaType | undefined
      const {source, slugify, maxLength} = slugType?.options ?? {}
      if (!slugType || !source) throw new Error(`${value._type}.${field} has no slug source`)
      const context = {...configContext, parentPath: [], parent: value} as SlugSourceContext
      const sourceValue =
        typeof source === 'function'
          ? await source(value as SanityDocument, context)
          : (typeof source === 'string' ? source.split('.') : source).reduce<unknown>(
              (parent, key) => (parent as Record<string, unknown> | undefined)?.[String(key)],
              value,
            )
      if (!sourceValue) return undefined
      if (slugify) return slugify(String(sourceValue), slugType, context)
      return speakingurl(String(sourceValue), {truncate: maxLength ?? 200, symbols: true})
    },

    // Runs the fresh-ID Duplicate as the document action does, and returns the copy. The source is
    // what the document pane shows: with release, that release's version if it has one, else
    // the draft, else the published document. The action gets Studio's client, which reads raw.
    // Like the action, it hands over the stored snapshot itself, so a change the operation makes
    // to its source shows in the dataset.
    async duplicate(id: string, {release}: {release?: string} = {}): Promise<TestDocument> {
      const publishedId = getPublishedId(id)
      const source =
        (release ? dataset.get(getVersionId(publishedId, release)) : undefined) ??
        dataset.get(getDraftId(publishedId)) ??
        dataset.get(publishedId)
      if (!source) throw new Error(`No document to duplicate with _id "${publishedId}"`)
      const client = getClient({apiVersion: '2025-02-19', perspective: 'raw'})
      const watched = {
        ...client,
        create: async (document: TestDocument) => {
          lastShared = sharedObjects(source, document)
          return client.create(document)
        },
      } as unknown as SanityClient
      const copy = await duplicateWithFreshIds(watched, source)
      return structuredClone(copy) as TestDocument
    },

    // The paths of objects and arrays that the last duplicate's copy still shared with its
    // source when the operation handed it to create, before the client serialized it. Empty when
    // the copy is independent.
    sharedWithSource(): string[] {
      return [...lastShared]
    },

    // Makes the draft, or with release the version in that release, the published document, as
    // the Publish button or publishing a release does. Like Studio, it refuses a version with
    // validation errors. Then it writes what Sanity's publish writes, with each reference picked
    // while its document was unpublished made strong. Like Content Lake, it refuses a strong
    // reference to a document that isn't published. A release publishes as one transaction, so
    // a version in the same release counts.
    async publish(id: string, {release}: {release?: string} = {}): Promise<TestDocument> {
      const publishedId = getPublishedId(id)
      const pending = dataset.get(versionId(id, release))
      if (!pending) throw new Error(`No version to publish with _id "${versionId(id, release)}"`)
      const problems = (await validate(pending)).filter(({level}) => level === 'error')
      if (problems.length) {
        const list = problems.map(({path, message}) => `${path}: ${message}`).join('\n')
        throw new Error(`${pending._id} has validation errors:\n${list}`)
      }
      const published = strengthenOnPublish({...pending, _id: publishedId}) as TestDocument
      // Content Lake checks the ID the reference names. It must be a published ID, never a draft
      // or version ID, and that document must exist, or have a version in this release.
      const missing = [...new Set(strongReferences(published))].filter(
        (ref) => ref !== publishedId && !(isPublishedId(ref) && referenceExists(ref, release)),
      )
      if (missing.length) {
        throw new Error(
          `Content Lake refuses ${publishedId}: it has a strong reference to ${missing.join(', ')}, which isn't published`,
        )
      }
      dataset.delete(pending._id)
      store(touch(published))
      return structuredClone(dataset.get(publishedId) as TestDocument)
    },

    // The ID that the ID input's Assign button sets on the draft, or with release on the version
    // in that release, from what's stored. Nothing is stored. The input reads the published
    // document and the draft from Studio's edit state, as this reads them from the dataset.
    assignedId(id: string, {release}: {release?: string} = {}): string {
      const publishedId = getPublishedId(id)
      const target = versionId(id, release)
      const document =
        dataset.get(target) ?? dataset.get(publishedId) ?? dataset.get(getDraftId(publishedId))
      const editorialId = document && editorialIdFor(document._type)
      if (!editorialId) throw new Error(`No editorial document with _id "${publishedId}"`)
      const value = (stored?: TestDocument) => stored?.[editorialId.field]
      return idToAssign(target, editorialId.kind, {
        published: value(dataset.get(publishedId)),
        draft: value(dataset.get(getDraftId(publishedId))),
      })
    },

    // Unpublishes the document as Sanity's Unpublish does, with no validation first: the
    // published document goes and the draft stays. With no draft, the published document becomes
    // the draft.
    async unpublish(id: string): Promise<void> {
      const publishedId = getPublishedId(id)
      const published = dataset.get(publishedId)
      if (!published) throw new Error(`No published document with _id "${publishedId}"`)
      const draftId = getDraftId(publishedId)
      if (!dataset.has(draftId)) store(touch({...published, _id: draftId}))
      dataset.delete(publishedId)
    },

    // Opens an intent URL as the structure tool does, such as intent('create', {type:
    // 'mediaSettings'}) for /intent/create/type=mediaSettings. A create intent without an ID
    // gets a random one first. Then Studio walks the desk for the pane closest to the root that
    // takes the intent: a document pane with that ID, a pane whose canHandleIntent says yes, or
    // a list of the type with the default filter. With none, it opens its plain editor outside
    // the desk. Nothing is stored until an edit. See lib/_chunks-es/index3.js:80-198,506-560.
    async intent(
      intent: 'create' | 'edit',
      {id = randomUUID(), type, ...rest}: {id?: string; type: string; template?: string},
    ): Promise<IntentPane> {
      const params = {...rest, id, type}
      type Match = {path: string[]; depth: number; level: number; document: StructureNode}
      async function traverse(
        node: StructureNode,
        flatIndex: number,
        path: string[],
        level: number,
      ): Promise<Match[]> {
        if (node.type === 'document' && node.id === id) {
          return [{path: [...path.slice(0, -1), id], depth: path.length, level, document: node}]
        }
        const takesIntent =
          node.canHandleIntent?.(intent, params, {pane: node, index: flatIndex}) ||
          (node.type === 'documentList' &&
            node.schemaTypeName === type &&
            node.options?.filter === '_type == $type')
        if (takesIntent) {
          const document = await openChild(node.child, id, [...path, id], node)
          return [{path: [...path, id], depth: path.length, level, document}]
        }
        if (node.type !== 'list' || !node.child || !node.items) return []
        const found = await Promise.all(
          node.items.map(async (item, index) =>
            item.type === 'divider' || !item.id
              ? []
              : traverse(
                  await openChild(node.child, item.id, [...path, item.id], node),
                  flatIndex + 1,
                  [...path, item.id],
                  index,
                ),
          ),
        )
        return found.flat()
      }
      const root = serializeNode(deskStructure(structureBuilder, structureContext))
      const [match] = (await traverse(root, 0, [], 0)).sort((a, b) =>
        a.depth === b.depth ? a.level - b.level : a.depth - b.depth,
      )
      // Studio's plain editor is the type's default document node with the intent's template.
      const {path, document} = match ?? {
        path: [`__edit__${id}`],
        document: {type: 'document', options: {id, type, template: rest.template}},
      }
      const {id: documentId = id, type: schemaType = type, template} = document.options ?? {}
      const initialValue = await paneInitialValue(documentId, schemaType, {
        ...document.options,
        template: template ?? rest.template,
      })
      return {path, documentId, schemaType, initialValue}
    },

    // Opens the desk at a path of item IDs, such as desk('media', 'mediaItems'), and returns
    // that pane. A document pane reports the value its form starts from. A document list shows
    // what the default perspective shows: each document's draft if it has one, else its
    // published version, in the list's default order. Release versions are left out.
    async desk(...path: string[]): Promise<DeskPane> {
      let node = serializeNode(deskStructure(structureBuilder, structureContext))
      for (const [index, id] of path.entries()) {
        const item = node.items?.find((candidate) => candidate.id === id)
        if (!item) throw new Error(`The desk has no item "${id}" at ${path.slice(0, index)}`)
        node = await openChild(item.child, id, path.slice(0, index + 1))
      }
      const {type, title, options = {}} = node
      if (type === 'list') {
        const items = (node.items ?? []).filter((item) => item.type !== 'divider')
        return {type, title, items: items.map((item) => ({id: item.id ?? '', title: item.title}))}
      }
      if (type === 'document') {
        const {id = '', type: schemaType = ''} = options
        const initialValue = await paneInitialValue(id, schemaType, options)
        return {type, title, documentId: id, schemaType, initialValue}
      }
      if (type !== 'documentList') return {type, title}

      const rows = new Map<string, TestDocument>()
      for (const document of dataset.values()) {
        if (isVersionId(document._id)) continue
        const id = getPublishedId(document._id)
        if (isDraftId(document._id) || !rows.has(id)) rows.set(id, document)
      }
      const ordering = options.defaultOrdering?.length
        ? options.defaultOrdering
        : [{field: '_updatedAt', direction: 'desc'}]
      const query = `*[${options.filter}] | order(${ordering.map(({field, direction}) => `${field} ${direction}`).join(', ')})`
      const params = options.params ?? {}
      const result = await evaluate(parse(query, {params}), {
        dataset: [...rows.values()],
        params,
        timestamp: fixedNow === undefined ? new Date() : new Date(fixedNow),
      })
      return {type, title, documents: structuredClone(await result.get())}
    },

    // The _ids Studio's search finds for text among these types, best match first, as Sanity
    // runs and ranks it. Without types it searches every type global search covers,
    // searchTypes(). Without a perspective it's the global search, which reads every version
    // through raw and shows each document once: its draft, else the published document, else a
    // release version (lib/index.js:52244, 52844 and 2969). With a perspective stack it's a
    // reference field's picker for those types, which searches in the editor's perspective:
    // ['drafts'] by default, ['published'], or a release first, such as ['rSpring', 'drafts']
    // (lib/index.js:17118 and 18346-18355). Its rows go by published _id.
    async search(
      text: string,
      types: string[] = globalSearchTypes(),
      {perspective}: {perspective?: string[]} = {},
    ): Promise<string[]> {
      const schemaTypes = types.map((type) => schema.get(type) as SchemaType)
      const client = getClient({apiVersion: '2025-02-19'})
      const {strategy} = source.search
      const search = perspective
        ? createSearch(schemaTypes, client, {
            tag: 'search.reference',
            strategy,
            perspective,
          })(text, {perspective, limit: 101})
        : createSearch(schemaTypes, client, {tag: 'search.global', unique: true, strategy})(text, {
            perspective: 'raw',
            limit: 1000,
          })
      const {hits} = await firstValueFrom(search)
      return hits.map(({hit}) => hit._id)
    },

    // The preview of a document, of an object value such as an array item's row, or of the _id
    // of a document in the dataset, from its type's preview config, as Sanity prepares it. Only
    // the fields the preview selects reach it.
    preview(document: ({_type: string} & Record<string, unknown>) | string): Preview {
      const value = typeof document === 'string' ? dataset.get(document) : document
      if (!value) throw new Error(`No document with _id "${document}"`)
      const type = schema.get(value._type) as PreviewableType
      const {title, subtitle, description, media} = prepareForPreview(value, type)
      const preview = Object.fromEntries(
        Object.entries({title, subtitle, description}).filter(([, text]) => text !== undefined),
      ) as Preview
      if (isValidElement(media)) {
        return {...preview, mediaText: textOf(media)}
      }
      return media === undefined ? preview : {...preview, media}
    },

    // Every document in the dataset, sorted by _id.
    documents(): TestDocument[] {
      return [...dataset.values()]
        .sort((a, b) => a._id.localeCompare(b._id))
        .map((document) => structuredClone(document))
    },

    // The tabs of a document type's form, in order, each with the fields it holds in the order
    // the form shows them. Studio adds an All fields tab of its own.
    groups(type: string): {name: string; title?: string; fields: string[]}[] {
      const schemaType = schema.get(type) as ObjectSchemaType | undefined
      if (!schemaType) throw new Error(`No type named "${type}"`)
      return (schemaType.groups ?? []).map(({name, title, fields = []}) => ({
        name,
        title,
        fields: fields.map((field) => field.name),
      }))
    },

    // The values a list field offers, in order, each with the title its dropdown or radio
    // buttons show. A plain value shows as itself.
    choices(type: string, field: string): {title: string; value: unknown}[] {
      const fieldType = (schema.get(type) as ObjectSchemaType | undefined)?.fields.find(
        ({name}) => name === field,
      )?.type
      const list = (fieldType?.options as {list?: unknown[]} | undefined)?.list
      if (!list) throw new Error(`${type}.${field} has no list of values`)
      return list.map((option) =>
        option && typeof option === 'object' && 'value' in option
          ? {
              title: String((option as {title?: unknown}).title ?? option.value),
              value: option.value,
            }
          : {title: String(option), value: option},
      )
    },
  }
}
