import {defineField, defineType} from 'sanity'
import {Library} from 'lucide-react'
import {artworkField} from './artwork'
import {editorialIdField} from './editorialId'
import {characterLimit, labelLimit} from './limits'
import {slugFields} from './slug'
import {sourceField} from './source'

const orderings = [
  {title: 'Newest first', value: 'newestFirst'},
  {title: 'Oldest first', value: 'oldestFirst'},
  {title: 'Manual order', value: 'manual'},
]

export default defineType({
  name: 'series',
  title: 'Series',
  type: 'document',
  icon: Library,
  fields: [
    editorialIdField('series'),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The name of the series viewers see, such as The Gospel of John.',
      validation: (rule) => [
        rule.required().error('Add a title for the series.'),
        labelLimit(rule),
      ],
    }),
    ...slugFields('series'),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      description:
        'What viewers read about the series on the website and in the apps. Plain text, up to 5,000 characters.',
      validation: (rule) => characterLimit(rule, 5000),
    }),
    artworkField('series'),
    defineField({
      name: 'ordering',
      title: 'Order',
      type: 'string',
      options: {list: orderings, layout: 'radio'},
      initialValue: 'newestFirst',
      validation: (rule) => rule.required(),
    }),
    sourceField('series'),
  ],
})
