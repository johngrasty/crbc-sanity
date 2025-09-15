import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'beliefsPage',
  title: 'Beliefs Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Page Title',
      type: 'string',
      initialValue: 'What We Believe',
      validation: (Rule) => Rule.required()
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
          initialValue: 'What We Believe'
        }),
        defineField({
          name: 'description',
          title: 'SEO Description',
          type: 'text',
          rows: 2,
          initialValue: 'Discover our core beliefs and theological foundations that guide our church community.'
        })
      ]
    }),
    defineField({
      name: 'hero',
      title: 'Hero Section',
      type: 'object',
      fields: [
        defineField({
          name: 'tagline',
          title: 'Tagline',
          type: 'string',
          initialValue: 'Rooted in Scripture, guided by faith.'
        }),
        defineField({
          name: 'taglineLink',
          title: 'Tagline Link',
          type: 'object',
          fields: [
            defineField({
              name: 'text',
              title: 'Link Text',
              type: 'string',
              initialValue: 'Learn more'
            }),
            defineField({
              name: 'href',
              title: 'Link URL',
              type: 'string',
              initialValue: '/about'
            })
          ]
        }),
        defineField({
          name: 'title',
          title: 'Main Title',
          type: 'string',
          initialValue: 'What We Believe',
          validation: (Rule) => Rule.required()
        }),
        defineField({
          name: 'description',
          title: 'Description',
          type: 'text',
          rows: 3,
          initialValue: 'Our faith is built on the solid foundation of God\'s Word. Discover the core beliefs and biblical truths that guide our church family and shape our worship together.'
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
              initialValue: 'Join Us Sunday'
            }),
            defineField({
              name: 'href',
              title: 'Button URL',
              type: 'string',
              initialValue: '/connect'
            })
          ]
        }),
        defineField({
          name: 'secondaryButton',
          title: 'Secondary Button',
          type: 'object',
          fields: [
            defineField({
              name: 'text',
              title: 'Button Text',
              type: 'string',
              initialValue: 'Our Story'
            }),
            defineField({
              name: 'href',
              title: 'Button URL',
              type: 'string',
              initialValue: '/about'
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
              initialValue: 'Open Bible with cross in background'
            })
          ]
        })
      ]
    }),
    defineField({
      name: 'content',
      title: 'Main Content',
      type: 'object',
      fields: [
        defineField({
          name: 'subheading',
          title: 'Section Subheading',
          type: 'string',
          initialValue: 'Our Foundation'
        }),
        defineField({
          name: 'title',
          title: 'Section Title',
          type: 'string',
          initialValue: 'Biblical Truth'
        }),
        defineField({
          name: 'description',
          title: 'Section Description',
          type: 'text',
          rows: 3,
          initialValue: 'Our beliefs are rooted in Scripture and guide every aspect of our church life. These fundamental truths shape our worship, fellowship, and mission in the community.'
        }),
        defineField({
          name: 'introText',
          title: 'Introduction Text (Optional)',
          type: 'text',
          rows: 3,
          description: 'Optional introductory paragraph that appears before the beliefs list',
          initialValue: 'Our beliefs are firmly rooted in the historic Christian faith as revealed in Scripture. We hold to the fundamental truths that have guided the church for centuries, believing that God\'s Word provides clear direction for both our personal lives and our life together as a community of believers.'
        }),
        defineField({
          name: 'quote',
          title: 'Featured Quote',
          type: 'object',
          fields: [
            defineField({
              name: 'text',
              title: 'Quote Text',
              type: 'text',
              rows: 4,
              initialValue: 'All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness, so that the servant of God may be thoroughly equipped for every good work.'
            }),
            defineField({
              name: 'reference',
              title: 'Scripture Reference',
              type: 'string',
              initialValue: '2 Timothy 3:16-17'
            }),
            defineField({
              name: 'version',
              title: 'Bible Version',
              type: 'string',
              initialValue: 'NIV'
            })
          ]
        }),
        defineField({
          name: 'beliefs',
          title: 'Core Beliefs',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                defineField({
                  name: 'title',
                  title: 'Belief Title',
                  type: 'string'
                }),
                defineField({
                  name: 'description',
                  title: 'Belief Description',
                  type: 'text',
                  rows: 3
                })
              ]
            }
          ],
          initialValue: [
            {
              title: 'The Trinity',
              description: 'We believe in one God eternally existing in three persons: Father, Son, and Holy Spirit, each fully God yet one in essence and purpose.'
            },
            {
              title: 'Salvation by Grace',
              description: 'We believe salvation is a gift from God through faith in Jesus Christ alone, not by works, so that no one may boast.'
            },
            {
              title: 'The Church',
              description: 'We believe the church is the body of Christ, called to worship, fellowship, discipleship, ministry, and mission in the world.'
            }
          ]
        }),
        defineField({
          name: 'closingText',
          title: 'Closing Text',
          type: 'text',
          rows: 3,
          initialValue: 'These foundational truths shape our worship, guide our relationships, and inspire our service to others. We invite you to explore these beliefs with us and discover how God\'s truth can transform your life.'
        }),
        defineField({
          name: 'callToAction',
          title: 'Call to Action',
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              title: 'CTA Title',
              type: 'string',
              initialValue: 'Come and See'
            }),
            defineField({
              name: 'description',
              title: 'CTA Description',
              type: 'text',
              rows: 3,
              initialValue: 'We believe that faith grows best in community. Join us for worship, Bible study, and fellowship as we explore God\'s Word together and support one another in our spiritual journey. Everyone is welcome, regardless of where you are in your faith journey.'
            })
          ]
        })
      ]
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'hero.title'
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Beliefs Page',
        subtitle: subtitle || 'What We Believe'
      }
    }
  }
})
