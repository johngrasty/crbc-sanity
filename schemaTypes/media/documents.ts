// Files viewers can download from a media item, such as sermon notes (contract section 3).
// Contract section 10.2 allows 50 on an item.
import {defineArrayMember, defineField} from 'sanity'
import {labelLimit} from './limits'
import {itemLimit} from './lists'

export const documentsField = defineField({
  name: 'documents',
  title: 'Documents',
  type: 'array',
  description: 'Files viewers can download, such as sermon notes or a handout, up to 50.',
  of: [
    defineArrayMember({
      name: 'mediaDocument',
      title: 'Document',
      type: 'object',
      fields: [
        defineField({
          name: 'label',
          title: 'Label',
          type: 'string',
          description: 'What viewers see on the download link, such as Sermon notes.',
          validation: (rule) => [rule.required(), labelLimit(rule)],
        }),
        defineField({
          name: 'file',
          title: 'File',
          type: 'file',
          validation: (rule) => [
            rule.required(),
            // Sanity's own checks catch a missing file, a missing asset and a broken asset
            // reference, each with one marker. They pass an asset set to null, which a paste or
            // an API write can leave, and which gives the website nothing to download.
            rule.custom((file) =>
              (file as {asset?: unknown} | undefined)?.asset === null
                ? 'This document has no file. Upload it again, or remove the document.'
                : true,
            ),
          ],
        }),
      ],
    }),
  ],
  validation: (rule) => itemLimit(rule, 50, 'documents'),
})
