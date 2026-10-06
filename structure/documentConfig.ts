// The document settings sanity.config.ts passes to Sanity. They live here, not in the config,
// because the full config can't load in Node and the test harness builds from this module.
import {
  getPublishedId,
  type DocumentActionsResolver,
  type FormComponents,
  type NewDocumentOptionsResolver,
  type SanityDocumentLike,
  type Template,
  type TemplateResolver,
} from 'sanity'
import {CalendarClock} from 'lucide-react'
import {editorialIdFor, newEditorialId} from '../schemaTypes/media/editorialId'
import {nextOccurrence, slotAt, standingSlots} from '../schemaTypes/media/standingSchedule'
import type {ZonedStart} from '../schemaTypes/media/zonedStart'
import {FreshIdDuplicateAction, PreviewAction} from './documentActions'
import {formFollowUpInput} from './FormFollowUpInput'
import {previewableTypes} from './preview'
import {singletonActions, singletonsWithTemplates, singletonTypes} from './singletons'

export const documentActions: DocumentActionsResolver = (prev, context) => {
  if (singletonTypes.has(context.schemaType)) {
    // A create intent URL can open a singleton that keeps its template under a random ID. Only
    // its fixed document, whose ID is the type name, gets actions.
    const fixed = context.documentId && getPublishedId(context.documentId) === context.schemaType
    if (singletonsWithTemplates.has(context.schemaType) && !fixed) return []
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

// One service event template per standing slot, named by the slot's label. It starts at the
// slot's next occurrence after the moment the editor creates it, with the slot's length. The
// event's other fields take their defaults.
const standingSlotTemplates: Template[] = standingSlots.map((slot) => ({
  id: `serviceEvent-${slot.slot}`,
  title: slot.label,
  description: `The next ${slot.label.toLowerCase()} service, at ${slot.localStart} for ${slot.expectedDurationMinutes} minutes`,
  schemaType: 'serviceEvent',
  icon: CalendarClock,
  value: () => ({
    scheduledStart: nextOccurrence(slot, Date.now()),
    expectedDurationMinutes: slot.expectedDurationMinutes,
  }),
}))

// Singletons have no template, except the ones whose fixed document opens with field defaults.
// Sanity's document pane applies those only through the type's template.
export const templates: TemplateResolver = (prev) =>
  [
    ...prev.filter(
      ({schemaType}) => !singletonTypes.has(schemaType) || singletonsWithTemplates.has(schemaType),
    ),
    ...standingSlotTemplates,
  ].map(withFreshId)

// No create menu offers a singleton that keeps its template: not the global create button, a
// structure list's "+" or a reference field's "Create new". Sanity names a type's default
// template after the type, and these singletons have only that one.
export const newDocumentOptions: NewDocumentOptionsResolver = (prev) =>
  prev.filter(({templateId}) => !singletonsWithTemplates.has(templateId))

// A patch for one document version. Keys in set and entries in unset are field paths such as
// title or editorHold.note.
export type DocumentPatch = {set?: Record<string, unknown>; unset?: string[]}

// A form follow-up step runs after each edit to a draft or release version of its type. It gets
// the version as it was before the edit, the edited version and the published document, and
// returns a patch for the version, or null when the version needs nothing. The harness's edit
// runs it. The type's form must run the same step, so the first ticket that registers one also
// wires it into the form.
export type FormFollowUp = (versions: {
  previous: SanityDocumentLike
  version: SanityDocumentLike
  published: SanityDocumentLike | null
}) => DocumentPatch | null

// When an edit moves a service event's start onto a standing slot, the length becomes the slot's,
// if it's empty or still holds the length of the slot the start was on before. A length the
// editor chose stays.
const fillSlotLength: FormFollowUp = ({previous, version}) => {
  const before = previous.scheduledStart as ZonedStart | undefined
  const after = version.scheduledStart as ZonedStart | undefined
  if (before?.local === after?.local && before?.timeZone === after?.timeZone) return null
  const slot = slotAt(after)
  const length = version.expectedDurationMinutes
  if (!slot || length === slot.expectedDurationMinutes) return null
  const untouched =
    length === undefined || length === null || length === slotAt(before)?.expectedDurationMinutes
  return untouched ? {set: {expectedDurationMinutes: slot.expectedDurationMinutes}} : null
}

export const formFollowUps: Partial<Record<string, FormFollowUp>> = {
  serviceEvent: fillSlotLength,
}

// The form components sanity.config.ts passes to Sanity. They run each type's follow-up step in
// the form after every change.
export const formComponents: FormComponents = {input: formFollowUpInput(formFollowUps)}
