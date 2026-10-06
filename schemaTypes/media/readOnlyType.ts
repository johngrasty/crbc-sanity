// Types that Studio registers only so it and the generated types know their shape. media-ops
// writes mediaRelease and liveStatus, and an admin writes mediaOps.binding. No editor draft or
// release version may ever replace what they wrote (decision D19).
import {isPublishedId, type DocumentDefinition} from 'sanity'

// The compiled type keeps __experimental_actions, but DocumentDefinition doesn't declare it.
type ReadOnlyDefinition = DocumentDefinition & {__experimental_actions: []}

// writer names who writes the documents, as the start of a sentence, such as media-ops.
export function readOnlyType(writer: string, definition: DocumentDefinition): ReadOnlyDefinition {
  return {
    ...definition,
    // Schema readOnly only locks the inputs. Without update and create here, the document form
    // itself refuses every patch: a paste, a custom input, or the first edit to a form a create
    // URL opens.
    __experimental_actions: [],
    // Global search leaves the type out, and so does the release tool's "Add document", which
    // is the same search.
    __experimental_omnisearch_visibility: false,
    // Releases and the API can make a version of any document without asking the schema or
    // the document actions. This error stops Studio from publishing one, or a release that
    // holds one. A mirror's ID has dots in it, but only drafts. and versions. make it
    // unpublished.
    validation: (rule) =>
      rule.custom((document) =>
        !document || isPublishedId(document._id)
          ? true
          : `${writer} writes this document, so this draft or release version can't be published. Ask a developer to remove it.`,
      ),
  }
}
