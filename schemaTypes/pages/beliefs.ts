import {navigationUriOptions, validateNavigationLink} from '../../lib/navigation-link'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'beliefsPage',
  title: 'Beliefs Page',
  type: 'document',
  groups: [
    {
      name: 'hero',
      title: 'Hero',
      default: true,
    },
    {
      name: 'beliefs',
      title: 'Beliefs',
    },
    {
      name: 'cta',
      title: 'Call to action',
    },
    {
      name: 'seo',
      title: 'SEO',
    },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Page Title',
      type: 'string',
      initialValue: 'What We Believe',
      validation: (Rule) => Rule.required(),
      group: 'hero',
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
          initialValue: 'What We Believe',
        }),
        defineField({
          name: 'description',
          title: 'SEO Description',
          type: 'text',
          rows: 2,
          initialValue:
            'Discover our core beliefs and theological foundations that guide our church community.',
        }),
      ],
      group: 'seo',
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
          initialValue: 'Rooted in Scripture, guided by faith.',
          validation: (Rule) => Rule.required(),
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
              initialValue: 'Learn more',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'href',
              title: 'Link URL',
              type: 'url',
              initialValue: '/about',
              validation: (Rule) => [
                Rule.required(),
                Rule.uri(navigationUriOptions).custom(validateNavigationLink),
              ],
            }),
          ],
        }),
        defineField({
          name: 'title',
          title: 'Main Title',
          type: 'string',
          initialValue: 'What We Believe',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'description',
          title: 'Description',
          type: 'text',
          rows: 3,
          initialValue:
            "Our faith is built on the solid foundation of God's Word. Discover the core beliefs and biblical truths that guide our church family and shape our worship together.",
          validation: (Rule) => Rule.required(),
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
              initialValue: 'Join Us Sunday',
            }),
            defineField({
              name: 'href',
              validation: (Rule) => Rule.uri(navigationUriOptions).custom(validateNavigationLink),
              title: 'Button URL',
              type: 'url',
              initialValue: '/connect',
            }),
          ],
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
              initialValue: 'Our Story',
            }),
            defineField({
              name: 'href',
              validation: (Rule) => Rule.uri(navigationUriOptions).custom(validateNavigationLink),
              title: 'Button URL',
              type: 'url',
              initialValue: '/about',
            }),
          ],
        }),
        defineField({
          name: 'image',
          title: 'Hero Image',
          type: 'image',
          options: {
            hotspot: true,
            aiAssist: {
              imageDescriptionField: 'alt',
            },
          },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              description:
                'Be specific, not generic. Use AI Assist (✨) to generate. 10 to 125 characters. Describe what is in the photo. Do not start with "image of".',
              validation: (Rule) =>
                Rule.required()
                  .min(10)
                  .max(125)
                  .error('Alt text is required (10-125 characters) for accessibility'),
            }),
          ],
          validation: (Rule) => Rule.required(),
        }),
      ],
      group: 'hero',
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
          initialValue: 'Our Foundation',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'title',
          title: 'Section Title',
          type: 'string',
          initialValue: 'Biblical Truth',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'description',
          title: 'Section Description',
          type: 'text',
          rows: 3,
          initialValue:
            'Our beliefs are rooted in Scripture and guide every aspect of our church life. These fundamental truths shape our worship, fellowship, and mission in the community.',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'introText',
          title: 'Introduction Text (Optional)',
          type: 'text',
          rows: 3,
          description: 'Optional introductory paragraph that appears before the beliefs list',
          initialValue:
            "Our beliefs are firmly rooted in the historic Christian faith as revealed in Scripture. We hold to the fundamental truths that have guided the church for centuries, believing that God's Word provides clear direction for both our personal lives and our life together as a community of believers.",
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
              initialValue:
                'All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness, so that the servant of God may be thoroughly equipped for every good work.',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'reference',
              title: 'Scripture Reference',
              type: 'string',
              initialValue: '2 Timothy 3:16-17',
            }),
            defineField({
              name: 'version',
              title: 'Bible Version',
              type: 'string',
              initialValue: 'NIV',
            }),
          ],
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
                  type: 'string',
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: 'description',
                  title: 'Belief Description',
                  type: 'text',
                  rows: 3,
                  validation: (Rule) => Rule.required(),
                }),
              ],
            },
          ],
          initialValue: [
            {
              title: 'The Trinity',
              description:
                'We believe in one God eternally existing in three persons: Father, Son, and Holy Spirit, each fully God yet one in essence and purpose.',
            },
            {
              title: 'Salvation by Grace',
              description:
                'We believe salvation is a gift from God through faith in Jesus Christ alone, not by works, so that no one may boast.',
            },
            {
              title: 'The Church',
              description:
                'We believe the church is the body of Christ, called to worship, fellowship, discipleship, ministry, and mission in the world.',
            },
          ],
          validation: (Rule) => Rule.min(1).error('Add at least one belief'),
        }),
        defineField({
          name: 'closingText',
          title: 'Closing Text',
          type: 'text',
          rows: 3,
          initialValue:
            "These foundational truths shape our worship, guide our relationships, and inspire our service to others. We invite you to explore these beliefs with us and discover how God's truth can transform your life.",
          validation: (Rule) => Rule.required(),
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
              initialValue: 'Come and See',
            }),
            defineField({
              name: 'description',
              title: 'CTA Description',
              type: 'text',
              rows: 3,
              initialValue:
                "We believe that faith grows best in community. Join us for worship, Bible study, and fellowship as we explore God's Word together and support one another in our spiritual journey. Everyone is welcome, regardless of where you are in your faith journey.",
            }),
          ],
        }),
      ],
      group: 'beliefs',
    }),
    defineField({
      name: 'cta',
      title: 'Call to Action Section',
      type: 'object',
      description: 'Bottom page CTA with gradient background',
      fields: [
        defineField({
          name: 'title',
          title: 'CTA Title',
          type: 'string',
          initialValue: 'Ready to take the next step?',
          description: 'Main heading for the call-to-action section',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'description',
          title: 'CTA Description',
          type: 'text',
          rows: 3,
          initialValue:
            "Join us in worship and discover more about what we believe. We'd love to answer your questions and help you grow in faith.",
          description: 'Supporting text for the CTA',
          validation: (Rule) => Rule.required(),
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
              initialValue: 'Ask a Question',
            }),
            defineField({
              name: 'href',
              validation: (Rule) => Rule.uri(navigationUriOptions).custom(validateNavigationLink),
              title: 'Button URL',
              type: 'url',
              initialValue: '/visit#contact',
            }),
          ],
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
              initialValue: 'Watch Sermons',
            }),
            defineField({
              name: 'href',
              validation: (Rule) => Rule.uri(navigationUriOptions).custom(validateNavigationLink),
              title: 'Button URL',
              type: 'url',
              initialValue: '/watch',
            }),
          ],
        }),
        defineField({
          name: 'image',
          title: 'Image',
          type: 'image',
          description: 'Image for the CTA section',
          options: {
            hotspot: true,
            aiAssist: {
              imageDescriptionField: 'alt',
            },
          },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              description:
                'Be specific, not generic. Use AI Assist (✨) to generate. 10 to 125 characters. Describe what is in the photo. Do not start with "image of".',
              validation: (Rule) =>
                Rule.required()
                  .min(10)
                  .max(125)
                  .error('Alt text is required (10-125 characters) for accessibility'),
            }),
          ],
          validation: (Rule) => Rule.required(),
        }),
      ],
      group: 'cta',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'hero.title',
    },
    prepare({title, subtitle}) {
      return {
        title: title || 'Beliefs Page',
        subtitle: subtitle || 'What We Believe',
      }
    },
  },
})
