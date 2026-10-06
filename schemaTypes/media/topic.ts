import {defineField, defineType} from 'sanity'
import {Tag} from 'lucide-react'
import {editorialIdField} from './editorialId'
import {aliasesField} from './aliases'
import {labelLimit} from './limits'
import {sameNameWarning} from './sameName'
import {sourceField} from './source'

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
      validation: (rule) => [
        rule.required().error('Add a label for the topic.'),
        labelLimit(rule),
        sameNameWarning(rule, {
          type: 'topic',
          field: 'label',
          message: (name) =>
            `Another topic already has the label ${name}. Check that it isn't the same topic.`,
        }),
      ],
    }),
    aliasesField('Other words editors might search for, such as Mercy for Grace. Up to 20.'),
    sourceField('topic'),
  ],
})
