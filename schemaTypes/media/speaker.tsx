import {defineField, defineType} from 'sanity'
import {Mic} from 'lucide-react'
import {editorialIdField} from './editorialId'
import {aliasesField} from './aliases'
import {labelLimit} from './limits'
import {sameNameWarning} from './sameName'

export default defineType({
  name: 'speaker',
  title: 'Speaker',
  type: 'document',
  icon: Mic,
  fields: [
    editorialIdField('speaker'),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'The name viewers see on recordings, such as Sam Jones.',
      validation: (rule) => [
        rule.required().error("Add the speaker's name."),
        labelLimit(rule),
        sameNameWarning(rule, {
          type: 'speaker',
          field: 'name',
          message: (name) =>
            `Another speaker is already named ${name}. Check that it isn't the same person.`,
        }),
      ],
    }),
    aliasesField(
      'Other names people know the speaker by, such as Pastor Sam. Search finds the speaker under any of them. Up to 20.',
    ),
  ],
})
