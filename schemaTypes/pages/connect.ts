import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'connectPage',
  title: 'Connect Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Page Title',
      type: 'string',
      initialValue: 'Connect Page'
    }),
    defineField({
      name: 'seo',
      title: 'SEO Settings',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'SEO Title',
          type: 'string',
          validation: Rule => Rule.max(60).warning('Keep SEO titles under 60 characters')
        }),
        defineField({
          name: 'description',
          title: 'SEO Description',
          type: 'text',
          rows: 3,
          validation: Rule => Rule.max(160).warning('Keep SEO descriptions under 160 characters')
        })
      ]
    }),
    defineField({
      name: 'hero',
      title: 'Hero Section',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'Hero Title',
          type: 'string'
        }),
        defineField({
          name: 'description',
          title: 'Hero Description',
          type: 'text',
          rows: 4
        }),
        defineField({
          name: 'buttons',
          title: 'Hero Buttons',
          type: 'object',
          fields: [
            defineField({
              name: 'primary',
              title: 'Primary Button',
              type: 'object',
              fields: [
                defineField({
                  name: 'text',
                  title: 'Button Text',
                  type: 'string'
                }),
                defineField({
                  name: 'href',
                  title: 'Button Link',
                  type: 'string'
                })
              ]
            }),
            defineField({
              name: 'secondary',
              title: 'Secondary Button',
              type: 'object',
              fields: [
                defineField({
                  name: 'text',
                  title: 'Button Text',
                  type: 'string'
                }),
                defineField({
                  name: 'href',
                  title: 'Button Link',
                  type: 'string'
                })
              ]
            })
          ]
        }),
        defineField({
          name: 'image',
          title: 'Hero Image',
          type: 'image',
          options: {
            hotspot: true
          },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              validation: Rule => Rule.required()
            })
          ]
        })
      ]
    }),
    defineField({
      name: 'contact',
      title: 'Contact Section',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'Contact Section Title',
          type: 'string'
        }),
        defineField({
          name: 'description',
          title: 'Contact Section Description',
          type: 'text',
          rows: 3
        })
      ]
    }),
    defineField({
      name: 'connectCards',
      title: 'Connect Cards Section',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'Section Title',
          type: 'string'
        }),
        defineField({
          name: 'description',
          title: 'Section Description',
          type: 'text',
          rows: 3
        }),
        defineField({
          name: 'cards',
          title: 'Connect Cards',
          type: 'array',
          of: [
            defineField({
              name: 'connectCard',
              title: 'Connect Card',
              type: 'object',
              fields: [
                defineField({
                  name: 'id',
                  title: 'Card ID',
                  type: 'string',
                  description: 'Unique identifier for the card'
                }),
                defineField({
                  name: 'title',
                  title: 'Card Title',
                  type: 'string'
                }),
                defineField({
                  name: 'description',
                  title: 'Card Description',
                  type: 'text',
                  rows: 2
                }),
                defineField({
                  name: 'href',
                  title: 'Card Link',
                  type: 'url',
                  description: 'Link to Planning Center Online form or other resource'
                }),
                defineField({
                  name: 'iconColor',
                  title: 'Icon Color',
                  type: 'string',
                  options: {
                    list: [
                      { title: 'Blue', value: 'blue' },
                      { title: 'Green', value: 'green' },
                      { title: 'Purple', value: 'purple' },
                      { title: 'Orange', value: 'orange' }
                    ]
                  }
                }),
                defineField({
                  name: 'icon',
                  title: 'Icon SVG Path',
                  type: 'text',
                  rows: 3,
                  description: 'SVG path data for the card icon'
                })
              ],
              preview: {
                select: {
                  title: 'title',
                  subtitle: 'description'
                }
              }
            })
          ]
        }),
        defineField({
          name: 'note',
          title: 'Privacy Note',
          type: 'text',
          rows: 2,
          description: 'Note about privacy and data usage'
        })
      ]
    })
  ],
  preview: {
    select: {
      title: 'title'
    }
  }
})
