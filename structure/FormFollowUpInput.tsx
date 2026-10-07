// Runs a type's form follow-up steps in Studio's form, as the harness's edit and open do. It
// wraps the document's root input and watches the form value. After each change, and once the
// document has loaded, it gathers every step's patch and applies them in one onChange.
import {useEffect, useRef} from 'react'
import {
  getPublishedId,
  isDraftId,
  isVersionId,
  set,
  unset,
  useEditState,
  type InputProps,
  type ObjectInputProps,
  type SanityDocumentLike,
} from 'sanity'
import type {DocumentPatch, FormFollowUp} from './documentConfig'
import {parsePatchPath} from './patchPath'

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

// The harness reads patch paths with the same parsePatchPath.
const formPatches = ({set: values = {}, unset: paths = []}: DocumentPatch) => [
  ...Object.entries(values).map(([path, value]) => set(value, parsePatchPath(path))),
  ...paths.map((path) => unset(parsePatchPath(path))),
]

// What the runner reads about the document's stored versions. In Studio that's Sanity's
// useEditState. DOM tests pass their own, because jsdom has no document store.
export type UseStoredVersions = (
  publishedId: string,
  typeName: string,
) => {draft: SanityDocumentLike | null; published: SanityDocumentLike | null; ready: boolean}

type FollowUpsProps = ObjectInputProps & {
  steps: FormFollowUp[]
  useStoredVersions: UseStoredVersions
}

function FollowUps({steps, useStoredVersions, ...props}: FollowUpsProps) {
  const {onChange, readOnly, schemaType} = props
  const version = props.value as SanityDocumentLike | undefined
  const {draft, published, ready} = useStoredVersions(
    getPublishedId(version?._id ?? ''),
    schemaType.name,
  )
  const previous = useRef(version)
  const lastSent = useRef<{rev: unknown; patch: string} | null>(null)

  // Patching during render throws, so the steps run in an effect. It runs after each change to
  // the form value, including a remote edit, and when the published document or the draft
  // changes, such as when a release publishes. It waits until both have loaded.
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
      draft: draft ?? null,
      readOnly: Boolean(readOnly),
    })
    if (!patch) return
    // When the server refuses a write, Sanity resets the value to the server's head, with the same
    // _rev, and the steps compute the same patch again. Send it once for each revision. A patch
    // that applied changes the value, so this never holds back a real write.
    const sending = {rev: version._rev, patch: JSON.stringify(patch)}
    const last = lastSent.current
    if (last && last.rev === sending.rev && last.patch === sending.patch) return
    lastSent.current = sending
    onChange(formPatches(patch))
  }, [draft, steps, onChange, published, readOnly, ready, version])

  return props.renderDefault(props)
}

// The form input for sanity.config.ts's form.components. It wraps only the root input of a
// document type that has follow-up steps.
export function formFollowUpInput(
  followUps: Partial<Record<string, FormFollowUp[]>>,
  useStoredVersions: UseStoredVersions = useEditState,
) {
  return function FormFollowUpInput(props: InputProps) {
    const steps = followUps[props.schemaType.name]
    if (props.id !== 'root' || props.schemaType.type?.name !== 'document' || !steps?.length) {
      return props.renderDefault(props)
    }
    return (
      <FollowUps
        {...(props as ObjectInputProps)}
        steps={steps}
        useStoredVersions={useStoredVersions}
      />
    )
  }
}
