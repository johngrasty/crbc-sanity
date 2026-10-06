// The test harness: the Studio built from the real registered schema and the document config
// module, over an in-memory dataset. Tests talk to this module, never to validators, inputs or
// actions directly.
import {randomUUID} from 'node:crypto'
import {evaluate, parse} from 'groq-js'
import {
  createSchema,
  defaultTemplatesForSchema,
  isDraftId,
  isVersionId,
  prepareTemplates,
  resolveInitialValue,
  type ConfigContext,
  type DocumentActionComponent,
  type SanityClient,
  type SanityDocument,
} from 'sanity'
import {schemaTypes} from '../schemaTypes'
import {documentActions, templates} from '../structure/documentConfig'

export type TestDocument = SanityDocument & Record<string, unknown>

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

export function createHarness() {
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

  return {
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
      const now = new Date().toISOString()
      const document = {
        ...value,
        _id: `drafts.${randomUUID()}`,
        _type: template.schemaType,
        _rev: randomUUID(),
        _createdAt: now,
        _updatedAt: now,
      } as TestDocument
      store(document)
      return structuredClone(document)
    },

    // Every document in the dataset, sorted by _id.
    documents(): TestDocument[] {
      return [...dataset.values()]
        .sort((a, b) => a._id.localeCompare(b._id))
        .map((document) => structuredClone(document))
    },
  }
}
