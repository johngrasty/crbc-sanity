// Applies a document type's form follow-up steps as the editor works. sanity.config.ts passes
// this as form.components.input, so Sanity renders it around every input in the form. It acts
// only at the document root, as the tasks plugin's root input does, so every type with steps in
// formFollowUps gets them without its own input.
import {useEffect} from 'react'
import {
  getPublishedId,
  set,
  unset,
  useEditState,
  type InputProps,
  type ObjectInputProps,
  type SanityDocumentLike,
} from 'sanity'
import {formFollowUpPatch, formFollowUps, type DocumentPatch} from './documentConfig'

// A follow-up patch as form patches, relative to the document root. Paths are dotted field names.
const formPatches = ({set: values = {}, unset: paths = []}: DocumentPatch) => [
  ...Object.entries(values).map(([path, value]) => set(value, path.split('.'))),
  ...paths.map((path) => unset(path.split('.'))),
]

function DocumentFollowUps(props: ObjectInputProps) {
  const {onChange, readOnly, schemaType} = props
  // The root value is the version the form shows, _id included.
  const version = props.value as SanityDocumentLike
  const {published, ready} = useEditState(getPublishedId(version._id), schemaType.name)
  useEffect(() => {
    // Until the edit state is ready, the published document isn't known yet.
    if (!ready) return
    const patch = formFollowUpPatch({version, published, readOnly: Boolean(readOnly)})
    if (patch) onChange(formPatches(patch))
  }, [version, published, ready, readOnly, onChange])
  return props.renderDefault(props)
}

export function FormFollowUpInput(props: InputProps) {
  const {id, schemaType} = props
  const isDocumentRoot = id === 'root' && schemaType.type?.name === 'document'
  return isDocumentRoot && formFollowUps[schemaType.name]?.length ? (
    <DocumentFollowUps {...(props as ObjectInputProps)} />
  ) : (
    props.renderDefault(props)
  )
}
