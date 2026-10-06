import {defineArrayMember, defineField, defineType} from 'sanity'
import {MonitorPlay} from 'lucide-react'
import {environmentField, mirrorFenceFields} from './mirrorFields'
import {readOnlyType} from './readOnlyType'

// One public release of a media item, as media-ops last projected it (contract sections 3 and
// 9.8). The fields follow the contract's SanityMediaRelease definition. Nulls are stored as
// nulls, which Studio shows as empty fields.
export default readOnlyType(
  'media-ops',
  defineType({
    name: 'mediaRelease',
    title: 'Media release',
    type: 'document',
    icon: MonitorPlay,
    fields: [
      environmentField,
      defineField({name: 'contentId', title: 'Content ID', type: 'string'}),
      defineField({
        name: 'kind',
        title: 'Kind',
        type: 'string',
        options: {
          list: [
            {title: 'Video', value: 'video'},
            {title: 'No video', value: 'nonvideo'},
          ],
        },
      }),
      defineField({
        name: 'public',
        title: 'Public',
        type: 'boolean',
        description: 'Whether the website and apps show this release.',
      }),
      defineField({name: 'assetId', title: 'Asset ID', type: 'string'}),
      defineField({name: 'playbackId', title: 'Playback ID', type: 'string'}),
      defineField({name: 'durationSeconds', title: 'Length in seconds', type: 'number'}),
      defineField({
        name: 'captions',
        title: 'Captions',
        type: 'array',
        of: [
          defineArrayMember({
            type: 'object',
            fields: [
              defineField({name: 'language', title: 'Language', type: 'string'}),
              defineField({name: 'label', title: 'Label', type: 'string'}),
              defineField({
                name: 'kind',
                title: 'Kind',
                type: 'string',
                options: {
                  list: [
                    {title: 'Live', value: 'live'},
                    {title: 'Generated', value: 'generated'},
                    {title: 'Uploaded', value: 'uploaded'},
                  ],
                },
              }),
              defineField({
                name: 'state',
                title: 'State',
                type: 'string',
                options: {
                  list: [
                    {title: 'Requested', value: 'requested'},
                    {title: 'Processing', value: 'processing'},
                    {title: 'Available', value: 'available'},
                  ],
                },
              }),
            ],
          }),
        ],
      }),
      defineField({name: 'publishedAt', title: 'First published', type: 'datetime'}),
      defineField({name: 'releaseVersion', title: 'Release version', type: 'number'}),
      ...mirrorFenceFields,
    ],
    preview: {
      select: {contentId: 'contentId', environment: 'environment', public: 'public'},
      prepare: ({contentId, environment, public: isPublic}) => ({
        title: contentId,
        subtitle: [environment, isPublic ? 'Public' : 'Not public'].filter(Boolean).join(', '),
      }),
    },
  }),
)
