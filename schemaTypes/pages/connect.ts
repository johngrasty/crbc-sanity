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
    }),
    defineField({
      name: 'newsletterCta',
      title: 'Newsletter CTA',
      type: 'object',
      description: 'Call-to-action for newsletter signup (simple CTA style)',
      fields: [
        defineField({
          name: 'heading',
          title: 'Heading',
          type: 'string',
          initialValue: 'Want to sign up for our email newsletter?'
        }),
        defineField({
          name: 'subheading',
          title: 'Subheading',
          type: 'string',
          initialValue: 'Or see the newsletter archive?'
        }),
        defineField({
          name: 'primaryButton',
          title: 'Primary Button',
          type: 'object',
          fields: [
            defineField({
              name: 'text',
              title: 'Button Text',
              type: 'string',
              initialValue: 'Sign up'
            }),
            defineField({
              name: 'href',
              title: 'Button URL',
              type: 'string',
              initialValue: 'http://eepurl.com/i1IYM-/'
            })
          ]
        }),
        defineField({
          name: 'secondaryButton',
          title: 'Secondary Link',
          type: 'object',
          fields: [
            defineField({
              name: 'text',
              title: 'Link Text',
              type: 'string',
              initialValue: 'Archive'
            }),
            defineField({
              name: 'href',
              title: 'Link URL',
              type: 'string',
              initialValue: '/newsletter'
            })
          ]
        }),
        defineField({
          name: 'backgroundColor',
          title: 'Background Color',
          type: 'string',
          options: {
            list: [
              { title: 'Light Blue', value: 'bg-blue-50' },
              { title: 'Light Green', value: 'bg-green-50' },
              { title: 'Light Purple', value: 'bg-purple-50' },
              { title: 'Light Gray', value: 'bg-gray-50' },
              { title: 'Brand Light', value: 'bg-brand-50' }
            ]
          },
          initialValue: 'bg-blue-50'
        })
      ]
    }),
    defineField({
      name: 'smsCta',
      title: 'SMS CTA',
      type: 'object',
      description: 'Call-to-action for SMS signup (two-column photo style)',
      fields: [
        defineField({
          name: 'heading',
          title: 'Heading',
          type: 'string',
          initialValue: 'Prefer to get text message alerts instead?'
        }),
        defineField({
          name: 'description',
          title: 'Description',
          type: 'text',
          rows: 3,
          initialValue: "Or maybe you want both? It's as simple as texting the word text to (828) 944-4047."
        }),
        defineField({
          name: 'features',
          title: 'Features',
          type: 'array',
          of: [{ type: 'string' }],
          initialValue: [
            'Get weekly announcements',
            'Receive direct links to sign up for events',
            'Hear about weather schedule changes',
            'Be the first to hear about special events',
            'Volunteer & service opportunities',
            'Encouragement & inspiration midweek'
          ]
        }),
        defineField({
          name: 'linkText',
          title: 'Link Text',
          type: 'string',
          initialValue: 'Click here to sign up.'
        }),
        defineField({
          name: 'linkHref',
          title: 'Link URL',
          type: 'string',
          initialValue: 'sms://+18289444047;?&body=text'
        }),
        defineField({
          name: 'image',
          title: 'Image',
          type: 'image',
          options: {
            hotspot: true
          },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              validation: (Rule) => Rule.required()
            })
          ]
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
