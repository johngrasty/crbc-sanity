// Runs a type's form follow-up steps in Studio's form, as the harness's edit and open do. It
// wraps the document's root input and watches the form value. After each change, and once the
// document has loaded, it gathers every step's patch and applies them in one onChange.
import {useEffect, useRef} from 'react'
import {
  getPublishedId,
  isDraftId,
  isVersionId,
  set,
  stringToPath,
  unset,
  useEditState,
  type InputProps,
  type ObjectInputProps,
  type SanityDocumentLike,
} from 'sanity'
import type {DocumentPatch, FormFollowUp} from './documentConfig'

// The one patch the form applies to the version it shows, from every step in order, or null
// when there's nothing to change. The runner and the harness both call this. It's null while the
// form is read-only, because a read-only form throws on any patch. It's null for a published
// document too, which the form shows before the first edit and after Publish or Discard,
// because a patch there would create a draft.
export function followUpPatch(
  steps: FormFollowUp[],
  {readOnly = false, ...versions}: Parameters<FormFollowUp>[0] & {readOnly?: boolean},
): DocumentPatch | null {
  const {_id} = versions.version
  if (readOnly || (!isDraftId(_id) && !isVersionId(_id))) return null
  const patches = steps.flatMap((step) => step(versions) ?? [])
  const merged: DocumentPatch = {}
  const values = Object.assign({}, ...patches.map((patch) => patch.set))
  const paths = patches.flatMap((patch) => patch.unset ?? [])
  if (Object.keys(values).length) merged.set = values
  if (paths.length) merged.unset = paths
  return merged.set || merged.unset ? merged : null
}

// Patch paths are in Sanity's string form, so a step can reach into an array item by its _key.
const formPatches = ({set: values = {}, unset: paths = []}: DocumentPatch) => [
  ...Object.entries(values).map(([path, value]) => set(value, stringToPath(path))),
  ...paths.map((path) => unset(stringToPath(path))),
]

function FollowUps({steps, ...props}: ObjectInputProps & {steps: FormFollowUp[]}) {
  const {onChange, readOnly, schemaType} = props
  const version = props.value as SanityDocumentLike | undefined
  const {published, ready} = useEditState(getPublishedId(version?._id ?? ''), schemaType.name)
  const previous = useRef(version)

  // Patching during render throws, so the steps run in an effect. It runs after each change to
  // the form value, including a remote edit, and when the published document changes, such as
  // when a release publishes. It waits until the published document has loaded.
  useEffect(() => {
    const before = previous.current
    previous.current = version
    if (!version || !ready) return
    // On the first run, or once the form shows another document, the steps see no change. A new
    // document's first patch turns its ID into a draft ID, so compare published IDs.
    const sameDocument = before && getPublishedId(before._id) === getPublishedId(version._id)
    const patch = followUpPatch(steps, {
      previous: sameDocument ? before : version,
      version,
      published: published ?? null,
      readOnly: Boolean(readOnly),
    })
    if (patch) onChange(formPatches(patch))
  }, [steps, onChange, published, readOnly, ready, version])

  return props.renderDefault(props)
}

// The form input for sanity.config.ts's form.components. It wraps only the root input of a
// document type that has follow-up steps.
export function formFollowUpInput(followUps: Partial<Record<string, FormFollowUp[]>>) {
  return function FormFollowUpInput(props: InputProps) {
    const steps = followUps[props.schemaType.name]
    if (props.id !== 'root' || props.schemaType.type?.name !== 'document' || !steps?.length) {
      return props.renderDefault(props)
    }
    return <FollowUps {...(props as ObjectInputProps)} steps={steps} />
  }
}
