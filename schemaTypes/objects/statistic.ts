import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'statistic',
  title: 'Statistic',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'e.g., "Years of Ministry", "Members", "Baptisms"'
    }),
    defineField({
      name: 'value',
      title: 'Value',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'e.g., "50+", "1,200", "150"'
    }),
    defineField({
      name: 'animatedStart',
      title: 'Animation Start Value',
      type: 'number',
      description: 'Starting number for animation (optional)'
    }),
    defineField({
      name: 'animatedEnd',
      title: 'Animation End Value',
      type: 'number',
      description: 'Ending number for animation (optional)'
    }),
    defineField({
      name: 'suffix',
      title: 'Suffix',
      type: 'string',
      description: 'e.g., "+", "K", "M" (optional)'
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Lower numbers appear first'
    })
  ],
  preview: {
    select: {
      title: 'label',
      subtitle: 'value'
    }
  }
})
