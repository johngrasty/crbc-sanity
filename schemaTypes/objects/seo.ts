import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'seo',
  title: 'SEO Settings',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Meta Title',
      type: 'string',
      description: 'Optional title override for search engines and social sharing',
    }),
    defineField({
      name: 'description',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      description: 'Optional description override for search engines and social sharing',
    }),
    defineField({
      name: 'image',
      title: 'Social Share Image',
      type: 'image',
      options: {hotspot: true},
      description: 'Optional image used when this page is shared',
    }),
  ],
})
