import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'aboutPage',
  title: 'About Page',
  type: 'document',
  groups: [
    {
      name: 'hero',
      title: 'Hero Section'
    },
    {
      name: 'mission',
      title: 'Mission & Vision'
    },
    {
      name: 'statistics',
      title: 'Statistics'
    },
    {
      name: 'team',
      title: 'Team & Leadership'
    },
    {
      name: 'history',
      title: 'History & Values'
    }
  ],
  fields: [
    // Hero Section
    defineField({
      name: 'hero',
      title: 'Hero Section',
      type: 'object',
      group: 'hero',
      fields: [
        defineField({
          name: 'heading',
          title: 'Main Heading',
          type: 'string',
          validation: (Rule) => Rule.required()
        }),
        defineField({
          name: 'lead',
          title: 'Lead Text',
          type: 'text',
          rows: 3,
          validation: (Rule) => Rule.required()
        }),
        defineField({
          name: 'images',
          title: 'Hero Images',
          type: 'array',
          of: [{ type: 'image', options: { hotspot: true } }],
          validation: (Rule) => Rule.max(4).min(1),
          description: 'Upload 1-4 images for the hero grid'
        })
      ]
    }),

    // Mission & Vision
    defineField({
      name: 'mission',
      title: 'Mission Section',
      type: 'object',
      group: 'mission',
      fields: [
        defineField({
          name: 'heading',
          title: 'Section Heading',
          type: 'string',
          initialValue: 'Our Mission'
        }),
        defineField({
          name: 'content',
          title: 'Mission Content',
          type: 'array',
          of: [{ type: 'block' }],
          validation: (Rule) => Rule.required()
        })
      ]
    }),

    // Statistics
    defineField({
      name: 'statistics',
      title: 'Statistics',
      type: 'object',
      group: 'statistics',
      fields: [
        defineField({
          name: 'heading',
          title: 'Section Heading',
          type: 'string',
          initialValue: 'By the Numbers'
        }),
        defineField({
          name: 'stats',
          title: 'Statistics',
          type: 'array',
          of: [{ type: 'statistic' }],
          validation: (Rule) => Rule.max(6)
        })
      ]
    }),

    // Team Section
    defineField({
      name: 'team',
      title: 'Team Section',
      type: 'object',
      group: 'team',
      fields: [
        defineField({
          name: 'heading',
          title: 'Section Heading',
          type: 'string',
          initialValue: 'Meet Our Team'
        }),
        defineField({
          name: 'subheading',
          title: 'Subheading',
          type: 'string',
          initialValue: 'Faithful leadership serving our community.'
        }),
        defineField({
          name: 'lead',
          title: 'Lead Text',
          type: 'text',
          rows: 3
        }),
        defineField({
          name: 'teamImage',
          title: 'Team Photo',
          type: 'image',
          options: { hotspot: true },
          description: 'Optional group photo of the team'
        }),
        defineField({
          name: 'description',
          title: 'Team Description',
          type: 'array',
          of: [{ type: 'block' }],
          description: 'Additional content about the team'
        }),
        defineField({
          name: 'members',
          title: 'Team Members',
          type: 'array',
          of: [{ type: 'reference', to: [{ type: 'staff' }] }],
          description: 'Select staff members to feature on the About page'
        })
      ]
    }),

    // History & Values
    defineField({
      name: 'history',
      title: 'History & Values',
      type: 'object',
      group: 'history',
      fields: [
        defineField({
          name: 'heading',
          title: 'Section Heading',
          type: 'string',
          initialValue: 'Our History'
        }),
        defineField({
          name: 'content',
          title: 'History Content',
          type: 'array',
          of: [{ type: 'block' }]
        }),
        defineField({
          name: 'foundedYear',
          title: 'Founded Year',
          type: 'number',
          description: 'Year the church was founded'
        }),
        defineField({
          name: 'values',
          title: 'Core Values',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'title', type: 'string', title: 'Value Title' },
                { name: 'description', type: 'text', title: 'Description', rows: 2 }
              ]
            }
          ]
        })
      ]
    })
  ],
  preview: {
    select: {
      title: 'hero.heading'
    },
    prepare({ title }) {
      return {
        title: title || 'About Page',
        subtitle: 'About Page Content'
      }
    }
  }
})
