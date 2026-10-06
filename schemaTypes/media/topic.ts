import {defineField, defineType} from 'sanity'
import {Tag} from 'lucide-react'
import {editorialIdField} from './editorialId'
import {labelLimit} from './limits'

export default defineType({
  name: 'topic',
  title: 'Topic',
  type: 'document',
  icon: Tag,
  fields: [
    editorialIdField('topic'),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (rule) => [rule.required().error('Add a label for the topic.'), labelLimit(rule)],
    }),
  ],
})
