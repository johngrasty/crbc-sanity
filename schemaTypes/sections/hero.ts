import {navigationUriOptions, validateNavigationLink} from '../../lib/navigation-link'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'hero',
  title: 'Hero Section',
  type: 'object',
  fieldsets: [{name: 'advanced', title: 'Advanced', options: {collapsible: true, collapsed: true}}],
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'backgroundImage',
      title: 'Background Image',
      type: 'image',
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'overlay',
      fieldset: 'advanced',
      title: 'Overlay Settings',
      type: 'object',
      fields: [
        {
          name: 'opacity',
          title: 'Overlay Opacity',
          type: 'number',
          validation: (Rule) => Rule.required().min(0).max(1),
          initialValue: 0.5,
          description: 'Value between 0 (fully transparent) and 1 (fully opaque)',
        },
        {
          name: 'blendMode',
          title: 'Blend Mode',
          type: 'string',
          options: {
            list: [
              {title: 'Multiply', value: 'multiply'},
              {title: 'Overlay', value: 'overlay'},
              {title: 'Darken', value: 'darken'},
              {title: 'Color', value: 'color'},
            ],
          },
          initialValue: 'multiply',
          validation: (Rule) => Rule.required(),
        },
      ],
    }),
    defineField({
      name: 'primaryCTA',
      title: 'Primary Call to Action',
      type: 'object',
      validation: (Rule) => Rule.required(),
      fields: [
        {
          name: 'text',
          title: 'Button Text',
          type: 'string',
          validation: (Rule) => Rule.required(),
        },
        {
          name: 'link',
          title: 'Button Link',
          type: 'url',
          validation: (Rule) => [
            Rule.required(),
            Rule.uri(navigationUriOptions).custom(validateNavigationLink),
          ],
        },
      ],
    }),
    defineField({
      name: 'secondaryCTA',
      title: 'Secondary Call to Action',
      type: 'object',
      fields: [
        {
          name: 'text',
          title: 'Button Text',
          type: 'string',
          validation: (Rule) => Rule.required(),
        },
        {
          name: 'link',
          title: 'Button Link',
          type: 'url',
          validation: (Rule) => [
            Rule.required(),
            Rule.uri(navigationUriOptions).custom(validateNavigationLink),
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'heading',
      subtitle: 'tagline',
      media: 'backgroundImage',
    },
  },
})
