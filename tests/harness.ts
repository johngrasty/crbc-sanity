// The test harness: the Studio built from the real registered schema and the document config
// module, over an in-memory dataset. Tests talk to this module, never to validators, inputs or
// actions directly.
import {randomUUID} from 'node:crypto'
import {evaluate, parse} from 'groq-js'
import {
  createSchema,
  defaultTemplatesForSchema,
  getDraftId,
  getPublishedId,
  getVersionId,
  isDraftId,
  isVersionId,
  pathToString,
  prepareTemplates,
  resolveInitialValue,
  validateDocument,
  type ConfigContext,
  type DocumentActionComponent,
  type SanityClient,
  type SanityDocument,
  type Workspace,
} from 'sanity'
import {schemaTypes} from '../schemaTypes'
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

// Sanity schedules validation and initial values through window.requestIdleCallback, falling
// back to window.setTimeout. window must not exist while sanity loads, because its module init
// then reads browser events, so it's set here, after the imports.
Object.assign(globalThis, {window: globalThis})

const schema = createSchema({name: 'default', types: schemaTypes})

// The defaults Sanity's structure tool hands to the root config for a draft, in its order:
// destructive actions last.
const defaultActions = (
  ['publish', 'unpublish', 'duplicate', 'restore', 'discardChanges', 'delete'] as const
).map((action) => Object.assign((): null => null, {action}) as DocumentActionComponent)

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

// A Sanity client over the in-memory dataset that answers queries with groq-js. Studio's client
// reads the raw perspective, every published, draft and release version. Add methods here as
// Studio code starts to call them.
function testClient(dataset: Map<string, TestDocument>, config: ClientConfig): SanityClient {
  const perspective = config.perspective ?? 'raw'
  const visible = () => {
    const documents = [...dataset.values()]
    if (perspective === 'raw') return documents
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

  // Studio starts from one template per document type and passes them through the config.
  const templateList = prepareTemplates(
    schema,
    templates(defaultTemplatesForSchema(schema), configContext),
  )

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
    const markers = await validateDocument({
      document: value as SanityDocument,
      workspace,
      getDocumentExists: async ({id}) => dataset.has(id),
      environment: 'studio',
    })
    return markers.map(({path, level, message}) => ({path: pathToString(path), level, message}))
  }

  const versionId = (id: string, release?: string) =>
    release ? getVersionId(getPublishedId(id), release) : getDraftId(getPublishedId(id))

  return {
    validate,

    // The names of the document actions Studio shows for a draft of this type.
    actions(type: string): string[] {
      const context = {
        ...configContext,
        schemaType: type,
        releaseId: undefined,
        versionType: 'draft' as const,
      }
      return documentActions(defaultActions, context).map(actionName)
    },

    // A new document from a template, stored as a draft, as Studio stores it on the first edit.
    async create(templateId: string, params?: Record<string, unknown>): Promise<TestDocument> {
      const template = templateList.find(({id}) => id === templateId)
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
      const source = dataset.get(versionId(id, release))
      if (!source) throw new Error(`No version to publish with _id "${versionId(id, release)}"`)
      const problems = (await validate(source)).filter(({level}) => level === 'error')
      if (problems.length) {
        const list = problems.map(({path, message}) => `${path}: ${message}`).join('\n')
        throw new Error(`${source._id} has validation errors:\n${list}`)
      }
      dataset.delete(source._id)
      store(touch({...source, _id: publishedId}))
      return structuredClone(dataset.get(publishedId) as TestDocument)
    },

    // Every document in the dataset, sorted by _id.
    documents(): TestDocument[] {
      return [...dataset.values()]
        .sort((a, b) => a._id.localeCompare(b._id))
        .map((document) => structuredClone(document))
    },
  }
}
