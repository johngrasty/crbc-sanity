// A media item's podcast audio (contract section 3): the file podcast apps download, and the GUID
// that tells them which episode it is. The importer and editors write it. Duplicate drops it,
// because the GUID names the original's episode.
import {defineField, getPublishedId} from 'sanity'
import type {FormFollowUp} from '../../structure/documentConfig'
import {otherHolder} from './uniqueValue'
import {urlRule} from './url'

const apiVersion = '2025-02-19'

// True when podcast audio has a value in any of its four fields.
function hasAudio(audio: unknown): boolean {
  const fields = (audio ?? {}) as Record<string, unknown>
  return ['url', 'mimeType', 'bytes', 'guid'].some(
    (field) => fields[field] !== undefined && fields[field] !== null && fields[field] !== '',
  )
}

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
  // A draft or release version that takes the published item's podcast audio off.
  validation: (rule) =>
    rule
      .custom(async (audio, context) => {
        if (hasAudio(audio) || !context.document) return true
        const publishedId = getPublishedId(context.document._id)
        if (context.document._id === publishedId) return true
        const client = context.getClient({apiVersion}).withConfig({perspective: 'raw'})
        const published: unknown = await client.fetch(`*[_id == $publishedId][0].audioEnclosure`, {
          publishedId,
        })
        return hasAudio(published)
          ? 'Podcast apps will drop this episode, because the published item has podcast audio and this version has none. Put it back unless you mean to take the episode down.'
          : true
      })
      .warning(),
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
        // Two items with one GUID would be one episode to podcast apps.
        rule.custom(async (guid, context) => {
          if (!guid) return true
          const holder = await otherHolder(context, {
            type: 'mediaItem',
            field: 'audioEnclosure.guid',
            value: guid,
          })
          return holder
            ? `The media item ${holder} already uses this GUID, so podcast apps would mix up the two episodes. Use a different GUID.`
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

// The form step that takes podcast audio off when an edit clears its last field, to nothing, null
// or an empty string. Sanity's form leaves an empty object behind, and its four required fields
// would then block Publish with nothing left to remove. When a form opens, previous is the
// version itself, so the step never writes then. An empty object an API write left stays, and
// shows its errors, until an editor changes it.
export const emptyAudioPatch: FormFollowUp = ({previous, version}) =>
  version.audioEnclosure !== undefined &&
  !hasAudio(version.audioEnclosure) &&
  hasAudio(previous.audioEnclosure)
    ? {unset: ['audioEnclosure']}
    : null
