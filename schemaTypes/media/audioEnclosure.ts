// A media item's podcast audio (contract section 3): the file podcast apps download, and the GUID
// that tells them which episode it is. The importer and editors write it. Duplicate drops it,
// because the GUID names the original's episode.
import {defineField, getPublishedId} from 'sanity'
import type {FormFollowUp} from '../../structure/documentConfig'
import {urlRule} from './url'

const apiVersion = '2025-02-19'

const formats = [
  {title: 'MP3 (audio/mpeg)', value: 'audio/mpeg'},
  {title: 'M4A (audio/mp4)', value: 'audio/mp4'},
  {title: 'AAC (audio/aac)', value: 'audio/aac'},
]

export const audioEnclosureField = defineField({
  name: 'audioEnclosure',
  title: 'Podcast audio',
  type: 'object',
  description:
    'The audio file podcast apps play for this item. Fill in all four fields, or leave them all empty.',
  fields: [
    defineField({
      name: 'url',
      title: 'Audio file address',
      type: 'url',
      description: 'Where podcast apps download the file, starting with https://.',
      validation: (rule) => urlRule(rule, {required: true}),
    }),
    defineField({
      name: 'mimeType',
      title: 'Format',
      type: 'string',
      options: {list: formats},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'bytes',
      title: 'File size in bytes',
      type: 'number',
      description: "The file's exact size. Podcast apps expect it to match the file.",
      validation: (rule) => [
        rule.required(),
        rule.custom((bytes) =>
          bytes === undefined || (Number.isInteger(bytes) && bytes >= 1)
            ? true
            : "Use the file's size in bytes, as a whole number above 0.",
        ),
      ],
    }),
    defineField({
      name: 'guid',
      title: 'Episode GUID',
      type: 'string',
      description:
        'The ID podcast apps use to tell episodes apart. Once the item is published, keep it the same, or apps treat the item as a new episode.',
      validation: (rule) => [
        rule.required(),
        // Two items with one GUID would be one episode to podcast apps. The raw perspective sees
        // every published, draft and release version, and sanity::versionOf leaves out this
        // item's own versions.
        rule.custom(async (guid, context) => {
          if (!guid || !context.document) return true
          const client = context.getClient({apiVersion}).withConfig({perspective: 'raw'})
          const taken = await client.fetch(
            `count(*[_type == "mediaItem" && audioEnclosure.guid == $guid && !sanity::versionOf($publishedId)]) > 0`,
            {guid, publishedId: getPublishedId(context.document._id)},
          )
          return taken
            ? 'Another media item already uses this GUID, so podcast apps would mix up the two episodes. Use a different GUID.'
            : true
        }),
        // A draft or release version that changes the published item's GUID.
        rule
          .custom(async (guid, context) => {
            if (!guid || !context.document) return true
            const publishedId = getPublishedId(context.document._id)
            if (context.document._id === publishedId) return true
            const client = context.getClient({apiVersion}).withConfig({perspective: 'raw'})
            const published: unknown = await client.fetch(
              `*[_id == $publishedId][0].audioEnclosure.guid`,
              {publishedId},
            )
            return typeof published !== 'string' || published === guid
              ? true
              : `Podcast apps will treat this as a new episode, because the published item's GUID is ${published}. Change it back unless you mean that.`
          })
          .warning(),
      ],
    }),
  ],
})

// The form step that takes off podcast audio with none of its four fields. Sanity's form leaves an
// empty object behind when an editor clears every field, and the four required fields would then
// block Publish with nothing left to remove. Opening an item an API write left that way fixes it
// too. An item has podcast audio once any of the four has a value.
export const emptyAudioPatch: FormFollowUp = ({version}) => {
  const audio = version.audioEnclosure
  if (audio === undefined) return null
  const fields = (audio ?? {}) as Record<string, unknown>
  const filled = ['url', 'mimeType', 'bytes', 'guid'].some(
    (field) => fields[field] !== undefined && fields[field] !== null && fields[field] !== '',
  )
  return filled ? null : {unset: ['audioEnclosure']}
}
