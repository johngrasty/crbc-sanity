// Types that Studio registers only so it and the generated types know their shape. media-ops
// writes mediaRelease and liveStatus, and an admin writes mediaOps.binding. No editor draft or
// release version may ever replace what they wrote (decision D19).
import {isPublishedId, type DocumentDefinition} from 'sanity'

// writer names who writes the documents, as the start of a sentence, such as media-ops.
export function readOnlyType(writer: string, definition: DocumentDefinition): DocumentDefinition {
  return {
    ...definition,
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
