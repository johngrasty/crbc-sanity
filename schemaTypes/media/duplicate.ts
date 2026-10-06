// The fresh-ID Duplicate for the five editorial types. The document action is a thin shell over
// this operation, and the test harness calls it too.
import type {SanityClient, SanityDocumentLike} from 'sanity'
import {editorialIdFor, newEditorialId} from './editorialId'

// Creates the copy as a new draft, even when the source is a release version, and returns it.
// The copy gets a new _id and a fresh editorial ID. Content Lake sets _rev and the timestamps.
export async function duplicateWithFreshIds(
  client: SanityClient,
  source: SanityDocumentLike,
): Promise<SanityDocumentLike> {
  const id = editorialIdFor(source._type)
  if (!id) throw new Error(`${source._type} isn't an editorial type`)
  const fields = Object.fromEntries(Object.entries(source).filter(([key]) => !key.startsWith('_')))
  return client.create({
    ...fields,
    _id: `drafts.${crypto.randomUUID()}`,
    _type: source._type,
    [id.field]: newEditorialId(id.kind),
  })
}
