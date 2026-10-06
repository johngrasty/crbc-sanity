// The document settings sanity.config.ts passes to Sanity. They live here, not in the config,
// because the full config can't load in Node and the test harness builds from this module.
import type {
  DocumentActionsResolver,
  FormComponents,
  NewDocumentOptionsResolver,
  SanityDocumentLike,
  Template,
  TemplateResolver,
} from 'sanity'
import {CalendarClock} from 'lucide-react'
import {
  editorialIdFor,
  editorialIds,
  idToKeep,
  newEditorialId,
} from '../schemaTypes/media/editorialId'
import {nextOccurrence, slotAt, standingSlots} from '../schemaTypes/media/standingSchedule'
import type {ZonedStart} from '../schemaTypes/media/zonedStart'
import {FreshIdDuplicateAction, PreviewAction} from './documentActions'
import {formFollowUpInput} from './FormFollowUpInput'
import {previewableTypes} from './preview'
import {singletonActions, singletonsWithTemplates, singletonTypes} from './singletons'

export const documentActions: DocumentActionsResolver = (prev, context) => {
  if (singletonTypes.has(context.schemaType)) {
    return prev.filter(({action}) => action && singletonActions.has(action))
  }
  // Sanity's Duplicate copies every field, the editorial ID too. The editorial types get the
  // fresh-ID Duplicate in its place. They also lose Schedule, because a scheduled draft is
  // validated only when Schedule is clicked and then publishes without another check. This goes
  // by type name, so a type gets both once it's listed in editorialIds.
  if (editorialIdFor(context.schemaType)) {
    return prev
      .filter((action) => action.action !== 'schedule')
      .map((action) => (action.action === 'duplicate' ? FreshIdDuplicateAction : action))
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
// the version as it was before the edit, the edited version, the published document and the
// stored draft, and returns a patch for the version, or null when the version needs nothing.
// When the draft is the version being edited, draft is the stored copy, which may lag the edit.
// The harness's edit runs it, and FormFollowUpInput runs it in Studio's form.
export type FormFollowUp = (versions: {
  previous: SanityDocumentLike
  version: SanityDocumentLike
  published: SanityDocumentLike | null
  draft: SanityDocumentLike | null
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

// A draft or release version keeps its document's ID. A paste, a history restore or an API write
// that changes it goes back on the next edit, so Unpublish can't carry a changed ID to the next
// publish. Before the first publish, a release version keeps its draft's ID.
const keepId: FormFollowUp = ({version, published, draft}) => {
  const id = editorialIdFor(version._type)
  if (!id) return null
  const kept = idToKeep(version._id, {published: published?.[id.field], draft: draft?.[id.field]})
  return kept && version[id.field] !== kept.id ? {set: {[id.field]: kept.id}} : null
}

// Each step with the types it runs on. A ticket that adds a step adds a line here.
const followUpSteps: [types: string[], step: FormFollowUp][] = [
  [Object.keys(editorialIds), keepId],
  [['serviceEvent'], fillSlotLength],
]

// A type with several steps runs them all on the same versions and applies their patches
// together, so each step must patch its own fields.
const allSteps =
  (steps: FormFollowUp[]): FormFollowUp =>
  (versions) => {
    const patches = steps.flatMap((step) => step(versions) ?? [])
    if (patches.length < 2) return patches[0] ?? null
    return {
      set: Object.assign({}, ...patches.map((patch) => patch.set)),
      unset: patches.flatMap((patch) => patch.unset ?? []),
    }
  }

export const formFollowUps: Partial<Record<string, FormFollowUp>> = Object.fromEntries(
  [...new Set(followUpSteps.flatMap(([types]) => types))].map((type) => [
    type,
    allSteps(followUpSteps.filter(([types]) => types.includes(type)).map(([, step]) => step)),
  ]),
)

// The form components sanity.config.ts passes to Sanity. They run each type's follow-up step in
// the form after every change.
export const formComponents: FormComponents = {input: formFollowUpInput(formFollowUps)}
