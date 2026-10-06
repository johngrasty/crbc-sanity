// The document settings sanity.config.ts passes to Sanity. They live here, not in the config,
// because the full config can't load in Node and the test harness builds from this module.
import type {DocumentActionsResolver, SanityDocumentLike, Template, TemplateResolver} from 'sanity'
import {editorialIdFor, newEditorialId} from '../schemaTypes/media/editorialId'
import {FreshIdDuplicateAction, PreviewAction} from './documentActions'
import {previewableTypes} from './preview'
import {singletonActions, singletonTypes} from './singletons'

export const documentActions: DocumentActionsResolver = (prev, context) => {
  if (singletonTypes.has(context.schemaType)) {
    return prev.filter(({action}) => action && singletonActions.has(action))
  }
  // Sanity's Duplicate copies every field, the editorial ID too. The editorial types get the
  // fresh-ID Duplicate in its place. This goes by type name, so a type gets it once it's listed
  // in editorialIds.
  if (editorialIdFor(context.schemaType)) {
    return prev.map((action) => (action.action === 'duplicate' ? FreshIdDuplicateAction : action))
  }
  return previewableTypes.has(context.schemaType) ? [...prev, PreviewAction] : prev
}

// Every template for an editorial type sets a fresh ID when the document is created, including
// "Create new" from a reference field. Sanity calls the value for each new document.
function withFreshId(template: Template): Template {
  const id = editorialIdFor(template.schemaType)
  if (!id) return template
  const {value} = template
  return {
    ...template,
    value: async (params: unknown, context: unknown) => ({
      ...(typeof value === 'function' ? await value(params, context) : value),
      [id.field]: newEditorialId(id.kind),
    }),
  }
}

export const templates: TemplateResolver = (prev) =>
  prev.filter(({schemaType}) => !singletonTypes.has(schemaType)).map(withFreshId)

// A patch for one document version. Keys in set and entries in unset are field paths such as
// title or editorHold.note.
export type DocumentPatch = {set?: Record<string, unknown>; unset?: string[]}

// A form follow-up step runs after each edit to a draft or release version of its type. It gets
// the edited version and the published document, and returns a patch for the version, or null
// when the version needs nothing. The harness's edit runs it. The type's form must run the same
// step, so the first ticket that registers one also wires it into the form.
export type FormFollowUp = (versions: {
  version: SanityDocumentLike
  published: SanityDocumentLike | null
}) => DocumentPatch | null

export const formFollowUps: Partial<Record<string, FormFollowUp>> = {}
