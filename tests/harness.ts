// The test harness: the Studio built from the real registered schema and the document config
// module, over an in-memory dataset. Tests talk to this module, never to validators, inputs or
// actions directly.
import {randomUUID} from 'node:crypto'
import {evaluate, parse} from 'groq-js'
import {assist} from '@sanity/assist'
import {visionTool} from '@sanity/vision'
import {
  createMockAuthStore,
  definePlugin,
  getDraftId,
  getPublishedId,
  getVersionFromId,
  getVersionId,
  isDraftId,
  isVersionId,
  pathToString,
  prepareConfig,
  resolveInitialValue,
  validateDocument,
  type ConfigContext,
  type DocumentActionComponent,
  type DocumentActionsVersionType,
  type SanityClient,
  type SanityDocument,
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
import {
  documentActions,
  formFollowUps,
  templates,
  type DocumentPatch,
} from '../structure/documentConfig'

export type TestDocument = {_id: string; _type: string} & Record<string, unknown>

// A validation marker. path is in Sanity's string form, for example passages[_key=="a"].book,
// and is empty for a document-level rule.
export type Marker = {path: string; level: 'error' | 'warning' | 'info'; message: string}

// A pane of the desk. A list has items, a document list has the documents it shows, and a
// document pane has its fixed document. Other panes, such as components, have only a type.
export type DeskPane = {
  type: string
  title?: string
  items?: {id: string; title?: string}[]
  documents?: TestDocument[]
  documentId?: string
  schemaType?: string
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
  schema: {types: schemaTypes, templates},
  document: {actions: documentActions},
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
  options?: {
    filter?: string
    params?: Record<string, unknown>
    defaultOrdering?: Ordering[]
    id?: string
    type?: string
  }
}
const structureBuilder = createStructureBuilder({source, perspectiveStack: []})
const structureContext = {...source, perspectiveStack: []} as unknown as StructureResolverContext
const serializeNode = (node: unknown): StructureNode => {
  const builder = node as {serialize?: () => StructureNode}
  return typeof builder.serialize === 'function' ? builder.serialize() : (node as StructureNode)
}
async function openChild(child: unknown, id: string, path: string[]): Promise<StructureNode> {
  if (typeof child !== 'function') return serializeNode(child)
  return serializeNode(await child(id, {index: 0, splitIndex: 0, path, params: {}, parent: null}))
}

const actionName = (action: DocumentActionComponent) =>
  action.action ?? action.displayName ?? action.name

// Applies set, then unset, as Sanity does. Paths are dotted field names.
function applyPatch(document: TestDocument, {set = {}, unset = []}: DocumentPatch): TestDocument {
  const next = structuredClone(document)
  for (const [path, value] of Object.entries(set)) {
    const keys = path.split('.')
    const field = keys.pop() as string
    let target: Record<string, unknown> = next
    for (const key of keys) target = (target[key] ??= {}) as Record<string, unknown>
    target[field] = structuredClone(value)
  }
  for (const path of unset) {
    const keys = path.split('.')
    const field = keys.pop() as string
    const parent = keys.reduce<unknown>(
      (value, key) => (value as Record<string, unknown>)?.[key],
      next,
    )
    if (parent && typeof parent === 'object') delete (parent as Record<string, unknown>)[field]
  }
  return next
}

type ClientConfig = {apiVersion?: string; perspective?: unknown}

// API version 2025-02-19 brought content releases. From then on Content Lake's default
// perspective is published, and raw includes release versions. Before it, the default is raw,
// and even raw leaves out versions.* documents. vX is the newest version.
const hasReleases = (apiVersion = '1') => {
  const version = apiVersion.replace(/^v/, '')
  return version === 'X' || version >= '2025-02-19'
}

// A Sanity client over the in-memory dataset that answers queries with groq-js. It sees what
// Content Lake would show at its API version, so a rule that forgets to ask for raw, or asks an
// API version older than releases, misses documents here too. Add methods as Studio code needs
// them.
function testClient(dataset: Map<string, TestDocument>, config: ClientConfig): SanityClient {
  const releases = hasReleases(config.apiVersion)
  const perspective = config.perspective ?? (releases ? 'published' : 'raw')
  const visible = () => {
    const documents = [...dataset.values()]
    if (perspective === 'raw')
      return releases ? documents : documents.filter(({_id}) => !isVersionId(_id))
    if (perspective === 'published') {
      return documents.filter(({_id}) => !isDraftId(_id) && !isVersionId(_id))
    }
    throw new Error(
      `The test client doesn't support the ${JSON.stringify(perspective)} perspective`,
    )
  }
  const client = {
    config: () => ({projectId: 'test', dataset: 'test', ...config, perspective}),
    withConfig: (next: ClientConfig) => testClient(dataset, {...config, ...next}),
    clone: () => testClient(dataset, config),
    async fetch(query: string, params: Record<string, unknown> = {}) {
      const result = await evaluate(parse(query, {params}), {dataset: visible(), params})
      return structuredClone(await result.get())
    },
  }
  return client as unknown as SanityClient
}

// documents seeds the dataset. Give each its full _id: item, drafts.item or
// versions.<release>.item.
export function createHarness({documents = []}: {documents?: TestDocument[]} = {}) {
  const dataset = new Map<string, TestDocument>()

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

  // Runs Sanity's own validateDocument, as Studio does in the form, against the dataset.
  // Takes a document, or the _id of one in the dataset.
  async function validate(document: TestDocument | string): Promise<Marker[]> {
    const value = typeof document === 'string' ? dataset.get(document) : document
    if (!value) throw new Error(`No document with _id "${document}"`)
    // Without i18n on the workspace, Sanity falls back to its English messages.
    const workspace = {schema, getClient} as unknown as Workspace
    // As in Studio, a referenced document exists when it's published. For a document in a
    // release, the referenced document's version in that release decides first: a version the
    // release deletes, with _system.delete, doesn't exist, and any other version does.
    const release = getVersionFromId(value._id)
    const exists = (id: string) => {
      const version = release === undefined ? undefined : dataset.get(getVersionId(id, release))
      if (version) return (version._system as {delete?: boolean} | undefined)?.delete !== true
      return dataset.has(getPublishedId(id))
    }
    const markers = await validateDocument({
      document: value as SanityDocument,
      workspace,
      getDocumentExists: async ({id}) => exists(id),
      environment: 'studio',
    })
    return markers.map(({path, level, message}) => ({path: pathToString(path), level, message}))
  }

  const versionId = (id: string, release?: string) =>
    release ? getVersionId(getPublishedId(id), release) : getDraftId(getPublishedId(id))

  return {
    validate,

    // The names of the document actions Studio's document pane shows for this type, resolved
    // through the whole plugin chain. Unnamed actions show their displayName. A version or a
    // scheduled draft belongs to the release rHarness.
    actions(type: string, versionType: DocumentActionsVersionType): string[] {
      const inRelease = versionType === 'version' || versionType === 'scheduled-draft'
      return source.document
        .actions({
          schemaType: type,
          documentId: type,
          versionType,
          releaseId: inRelease ? 'rHarness' : undefined,
        })
        .map(actionName)
    },

    // A new document from a template, stored as a draft, as Studio stores it on the first edit.
    async create(templateId: string, params?: Record<string, unknown>): Promise<TestDocument> {
      const template = source.templates.find(({id}) => id === templateId)
      if (!template) throw new Error(`No template named "${templateId}"`)
      const value = await resolveInitialValue(schema, template, params, configContext)
      const document = touch({
        ...value,
        _id: `drafts.${randomUUID()}`,
        _type: template.schemaType,
        _createdAt: new Date().toISOString(),
      })
      store(document)
      return structuredClone(document)
    },

    // Patches the draft, or with release the version in that release, as an editor's form edit
    // does. A missing version starts from the published document, or for a release from the
    // draft when nothing is published. Then the type's form follow-up step runs.
    async edit(
      id: string,
      patch: DocumentPatch,
      {release}: {release?: string} = {},
    ): Promise<TestDocument> {
      const publishedId = getPublishedId(id)
      const target = versionId(id, release)
      const published = dataset.get(publishedId) ?? null
      const base =
        dataset.get(target) ?? published ?? (release ? dataset.get(getDraftId(publishedId)) : null)
      if (!base) throw new Error(`No document to edit with _id "${publishedId}"`)
      let version = applyPatch({...base, _id: target}, patch)
      const followUp = formFollowUps[version._type]?.({version, published})
      if (followUp) version = applyPatch(version, followUp)
      store(touch(version))
      return structuredClone(dataset.get(target) as TestDocument)
    },

    // Makes the draft, or with release the version in that release, the published document, as
    // the Publish button or publishing a release does. Like Studio, it refuses a version with
    // validation errors.
    async publish(id: string, {release}: {release?: string} = {}): Promise<TestDocument> {
      const publishedId = getPublishedId(id)
      const pending = dataset.get(versionId(id, release))
      if (!pending) throw new Error(`No version to publish with _id "${versionId(id, release)}"`)
      const problems = (await validate(pending)).filter(({level}) => level === 'error')
      if (problems.length) {
        const list = problems.map(({path, message}) => `${path}: ${message}`).join('\n')
        throw new Error(`${pending._id} has validation errors:\n${list}`)
      }
      dataset.delete(pending._id)
      store(touch({...pending, _id: publishedId}))
      return structuredClone(dataset.get(publishedId) as TestDocument)
    },

    // Opens the desk at a path of item IDs, such as desk('media', 'mediaItems'), and returns
    // that pane. A document list shows what the default perspective shows: each document's
    // draft if it has one, else its published version, in the list's default order. Release
    // versions are left out.
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
      if (type === 'document')
        return {type, title, documentId: options.id, schemaType: options.type}
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
      const result = await evaluate(parse(query, {params}), {dataset: [...rows.values()], params})
      return {type, title, documents: structuredClone(await result.get())}
    },

    // Every document in the dataset, sorted by _id.
    documents(): TestDocument[] {
      return [...dataset.values()]
        .sort((a, b) => a._id.localeCompare(b._id))
        .map((document) => structuredClone(document))
    },
  }
}
