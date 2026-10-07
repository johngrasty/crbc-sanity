// Finds another document of a type that holds a value that must be unique among them, such as an
// import source ID or a podcast GUID. A published document owns its value, as #20's ID rule has
// it. When this document's published version holds the value, only another published document
// conflicts, so a draft that copies the value is blocked and doesn't block the owner. Otherwise
// every published, draft and release version of every other document counts. The answer is the
// first conflicting _id in _id order, or undefined.
import {getPublishedId, type ValidationContext} from 'sanity'

const apiVersion = '2025-02-19'

export async function otherHolder(
  context: ValidationContext,
  {
    type,
    field,
    value,
  }: {type: string; field: 'source.sourceId' | 'audioEnclosure.guid'; value: string},
): Promise<string | undefined> {
  if (!context.document) return undefined
  // The raw perspective sees every published, draft and release version. sanity::versionOf
  // leaves out this document's own versions.
  const client = context.getClient({apiVersion}).withConfig({perspective: 'raw'})
  const others = `*[_type == $type && ${field} == $value && !sanity::versionOf($publishedId)]`
  const {published, takenByPublished, takenByAny} = await client.fetch(
    `{
      "published": *[_id == $publishedId][0].${field},
      "takenByPublished": ${others}[!(_id in path("drafts.**")) && !(_id in path("versions.**"))] | order(_id asc)[0]._id,
      "takenByAny": ${others} | order(_id asc)[0]._id
    }`,
    {type, value, publishedId: getPublishedId(context.document._id)},
  )
  return (published === value ? takenByPublished : takenByAny) ?? undefined
}
