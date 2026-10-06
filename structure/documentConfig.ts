// The document settings sanity.config.ts passes to Sanity. They live here, not in the config,
// because the full config can't load in Node and the test harness builds from this module.
import {
  isPublishedId,
  type DocumentActionsResolver,
  type NewDocumentOptionsResolver,
  type SanityDocumentLike,
  type Template,
  type TemplateResolver,
} from 'sanity'
import {editorialIdFor, newEditorialId} from '../schemaTypes/media/editorialId'
import {slugHistoryPatch, slugTypes} from '../schemaTypes/media/slug'
import {FreshIdDuplicateAction, PreviewAction} from './documentActions'
import {previewableTypes} from './preview'
import {singletonActions, singletonsWithTemplates, singletonTypes} from './singletons'

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

// Singletons have no template, except the ones whose fixed document opens with field defaults.
// Sanity's document pane applies those only through the type's template.
export const templates: TemplateResolver = (prev) =>
  prev
    .filter(
      ({schemaType}) => !singletonTypes.has(schemaType) || singletonsWithTemplates.has(schemaType),
    )
    .map(withFreshId)

// No create menu offers a singleton that keeps its template: not the global create button, a
// structure list's "+" or a reference field's "Create new". Sanity names a type's default
// template after the type, and these singletons have only that one.
export const newDocumentOptions: NewDocumentOptionsResolver = (prev) =>
  prev.filter(({templateId}) => !singletonsWithTemplates.has(templateId))

// A patch for one document version. Keys in set and entries in unset are field paths such as
// title or editorHold.note.
export type DocumentPatch = {set?: Record<string, unknown>; unset?: string[]}

// A form follow-up step keeps fields of a draft or release version in step with the published
// document. It gets the edited version and the published document, and returns a patch for the
// version, or null when the version needs nothing. Each step owns its own fields, and a step
// that has nothing left to change returns null, so the form doesn't patch forever.
export type FormFollowUp = (versions: {
  version: SanityDocumentLike
  published: SanityDocumentLike | null
}) => DocumentPatch | null

// Each type's follow-up steps. Every type with a slug keeps its slug history.
export const formFollowUps: Partial<Record<string, FormFollowUp[]>> = Object.fromEntries(
  Object.keys(slugTypes).map((type) => [type, [slugHistoryPatch]]),
)

// The one patch the form applies to the version it shows, from every step registered for the
// type, or null when there's nothing to change. The form input and the harness both call this.
// It's null while the form is read-only. It's null for a published document too, which the form
// shows while there's no draft, because any patch there creates a draft.
export function formFollowUpPatch(
  {version, published, readOnly = false}: Parameters<FormFollowUp>[0] & {readOnly?: boolean},
  steps: FormFollowUp[] = formFollowUps[version._type] ?? [],
): DocumentPatch | null {
  if (readOnly || isPublishedId(version._id)) return null
  const patches = steps.flatMap((step) => step({version, published}) ?? [])
  const merged: DocumentPatch = {}
  const set = Object.assign({}, ...patches.map((patch) => patch.set))
  const unset = patches.flatMap((patch) => patch.unset ?? [])
  if (Object.keys(set).length) merged.set = set
  if (unset.length) merged.unset = unset
  return merged.set || merged.unset ? merged : null
}
