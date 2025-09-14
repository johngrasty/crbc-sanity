import { defineType } from 'sanity'

export default defineType({
  name: 'footerSettings',
  title: 'Footer Settings',
  type: 'document',
  fields: [
    {
      name: 'callToAction',
      title: 'Call to Action Section',
      type: 'object',
      fields: [
        {
          name: 'subheading',
          title: 'Subheading',
          type: 'string',
          validation: Rule => Rule.required()
        },
        {
          name: 'title',
          title: 'Main Title',
          type: 'string',
          validation: Rule => Rule.required()
        },
        {
          name: 'description',
          title: 'Description',
          type: 'text',
          rows: 3,
          validation: Rule => Rule.required()
        },
        {
          name: 'button',
          title: 'Call to Action Button',
          type: 'object',
          fields: [
            {
              name: 'text',
              title: 'Button Text',
              type: 'string',
              validation: Rule => Rule.required()
            },
            {
              name: 'href',
              title: 'Button Link',
              type: 'string',
              validation: Rule => Rule.required()
            },
            {
              name: 'usePcoModal',
              title: 'Open in Planning Center Modal',
              type: 'boolean',
              description: 'When enabled, the button will open in a Planning Center modal instead of navigating to a new page',
              initialValue: false
            }
          ]
        }
      ]
    },
  ],
  preview: {
    prepare() {
      return {
        title: 'Footer Settings'
      }
    }
  }
})
