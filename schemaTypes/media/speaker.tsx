import {defineField, defineType} from 'sanity'
import {Mic} from 'lucide-react'
import {editorialIdField} from './editorialId'
import {labelLimit} from './limits'

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
      validation: (rule) => [rule.required().error("Add the speaker's name."), labelLimit(rule)],
    }),
  ],
})
