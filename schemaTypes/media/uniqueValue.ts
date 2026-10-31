// Finds another document of a type that holds a value that must be unique among them, such as an
// import source ID or a podcast GUID. A published document owns its value, as #20's ID rule has
// it. When this document's published version holds the value, only another published document
// conflicts, so a draft that copies the value is blocked and doesn't block the owner. Otherwise
// every published, draft and release version of every other document counts. The answer is the
// first conflicting _id in _id order, or undefined.
import {getPublishedId, type ValidationContext} from 'sanity'

const apiVersion = '2025-02-19'

// The GROQ filter for a document that holds $value. A document holds a source ID as its own
// source.sourceId or as one of its source.aliases, and one value has one holder across both
// fields (erratum E85).
const holds = {
  sourceId: '(source.sourceId == $value || $value in source.aliases)',
  podcastGuid: 'audioEnclosure.guid == $value',
}

export async function otherHolder(
  context: ValidationContext,
  {type, value, kind}: {type: string; value: string; kind: keyof typeof holds},
): Promise<string | undefined> {
  if (!context.document) return undefined
  // The raw perspective sees every published, draft and release version. sanity::versionOf
  // leaves out this document's own versions.
  const client = context.getClient({apiVersion}).withConfig({perspective: 'raw'})
  const others = `*[_type == $type && ${holds[kind]} && !sanity::versionOf($publishedId)]`
  const {published, takenByPublished, takenByAny} = await client.fetch(
    `{
      "published": count(*[_id == $publishedId && ${holds[kind]}]) > 0,
      "takenByPublished": ${others}[!(_id in path("drafts.**")) && !(_id in path("versions.**"))] | order(_id asc)[0]._id,
      "takenByAny": ${others} | order(_id asc)[0]._id
    }`,
    {type, value, publishedId: getPublishedId(context.document._id)},
  )
  return (published ? takenByPublished : takenByAny) ?? undefined
}
