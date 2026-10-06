// Runs a type's form follow-up step in Studio's form, as the harness's edit does after each patch.
// It wraps the document's root input, watches the form value, and after each change calls the
// step with the value before the change, the value after it and the published document.
import {useEffect, useRef} from 'react'
import {
  getPublishedId,
  set,
  unset,
  useEditState,
  type InputProps,
  type ObjectInputProps,
  type SanityDocumentLike,
} from 'sanity'
import type {DocumentPatch, FormFollowUp} from './documentConfig'

const formPatches = ({set: values = {}, unset: paths = []}: DocumentPatch) => [
  ...Object.entries(values).map(([path, value]) => set(value, path.split('.'))),
  ...paths.map((path) => unset(path.split('.'))),
]

function FollowUp({followUp, ...props}: ObjectInputProps & {followUp: FormFollowUp}) {
  const {onChange, readOnly, schemaType} = props
  const version = props.value as SanityDocumentLike | undefined
  const {published, ready} = useEditState(getPublishedId(version?._id ?? ''), schemaType.name)
  const previous = useRef(version)

  // Patching during render throws, so the step runs in an effect. It skips a read-only form,
  // which throws on any patch, and waits until the published document has loaded. A remote
  // edit runs the step too, and the step's patch is the same in every open form.
  useEffect(() => {
    const before = previous.current
    previous.current = version
    if (!before || !version || before === version || readOnly || !ready) return
    // A new document's first patch turns its ID into a draft ID, so compare published IDs.
    if (getPublishedId(before._id) !== getPublishedId(version._id)) return
    const patch = followUp({previous: before, version, published: published ?? null})
    if (patch) onChange(formPatches(patch))
  }, [followUp, onChange, published, readOnly, ready, version])

  return props.renderDefault(props)
}

// The form input for sanity.config.ts's form.components. It wraps only the root input of a
// document type that has a follow-up step.
export function formFollowUpInput(followUps: Partial<Record<string, FormFollowUp>>) {
  return function FormFollowUpInput(props: InputProps) {
    const followUp = followUps[props.schemaType.name]
    if (props.id !== 'root' || props.schemaType.type?.name !== 'document' || !followUp) {
      return props.renderDefault(props)
    }
    return <FollowUp {...(props as ObjectInputProps)} followUp={followUp} />
  }
}
