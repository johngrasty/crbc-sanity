import {defineField, defineType} from 'sanity'
import {Tag} from 'lucide-react'
import {editorialIdField} from './editorialId'
import {aliasesField} from './aliases'
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
      description: 'The topic as viewers see it when they browse, such as Grace.',
      validation: (rule) => [rule.required().error('Add a label for the topic.'), labelLimit(rule)],
    }),
    aliasesField('Other words editors might search for, such as Mercy for Grace. Up to 20.'),
  ],
})
