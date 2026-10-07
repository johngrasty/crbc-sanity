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
          validation: (rule) => rule.required(),
        }),
      ],
    }),
  ],
  validation: (rule) => itemLimit(rule, 50, 'documents'),
})
