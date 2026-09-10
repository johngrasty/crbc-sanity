import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'visitPage',
  title: 'Visit Page',
  type: 'document',
  groups: [
    {
      name: 'hero',
      title: 'Hero',
      default: true
    },
    {
      name: 'planVisit',
      title: 'Plan your visit'
    },
    {
      name: 'faq',
      title: 'FAQ'
    },
    {
      name: 'seo',
      title: 'SEO'
    }
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Page Title',
      type: 'string',
      initialValue: 'Visit Us',
      validation: (Rule) => Rule.required(),
      group: 'hero'
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
          initialValue: 'Visit Us - Plan Your First Visit'
        }),
        defineField({
          name: 'description',
          title: 'SEO Description',
          type: 'text',
          rows: 2,
          initialValue: 'Plan your first visit to CRBC. Find service times, what to expect, directions, and answers to common questions about visiting our church.'
        })
      ],
      group: 'seo'
    }),
    defineField({
      name: 'hero',
      title: 'Hero Section',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'Main Title',
          type: 'string',
          initialValue: 'We\'re excited to meet you',
          validation: (Rule) => Rule.required()
        }),
        defineField({
          name: 'description',
          title: 'Description',
          type: 'text',
          rows: 4,
          initialValue: 'Whether you\'re exploring faith for the first time or looking for a new church home, we welcome you with open arms. Come as you are and discover a community where you can grow in your relationship with God and connect with others.',
          validation: (Rule) => Rule.required()
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
              initialValue: 'Plan Your Visit'
            }),
            defineField({
              name: 'href',
              title: 'Button Target (anchor)',
              type: 'string',
              initialValue: '#plan-visit'
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
              initialValue: 'Watch Online'
            }),
            defineField({
              name: 'href',
              title: 'Button URL',
              type: 'string',
              initialValue: '/watch'
            })
          ]
        }),
        defineField({
          name: 'images',
          title: 'Hero Images',
          type: 'array',
          of: [
            {
              type: 'image',
              options: {
                hotspot: true,
                aiAssist: {
                  imageDescriptionField: 'alt'
                }
              },
              fields: [
                defineField({
                  name: 'alt',
                  title: 'Alt Text',
                  type: 'string',
                  description: 'Describe the specific image used (10-125 characters). Be specific, not generic. Use AI Assist (✨) to generate. See ALT_TEXT_GUIDE.md.',
                  validation: (Rule) => Rule.required().min(10).max(125).error('Alt text is required (10-125 characters) for accessibility')
                })
              ]
            }
          ],
          validation: (Rule) => Rule.min(3).max(5).error('Please upload between 3 and 5 images for the hero section grid'),
          description: 'Upload 3 to 5 images that will be displayed in the hero section grid. The layout adapts to the number you upload.'
        })
      ],
      group: 'hero'
    }),
    defineField({
      name: 'planVisit',
      title: 'Plan Your Visit Section',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'Section Title',
          type: 'string',
          initialValue: 'Plan Your Visit',
          validation: (Rule) => Rule.required()
        }),
        defineField({
          name: 'description',
          title: 'Section Description',
          type: 'text',
          rows: 3,
          initialValue: 'We want your first visit to be comfortable and welcoming. Here\'s everything you need to know to plan your visit with us.',
          validation: (Rule) => Rule.required()
        }),
        defineField({
          name: 'serviceInfo',
          title: 'Service Information',
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              title: 'Service Info Title',
              type: 'string',
              initialValue: 'Service Times',
              validation: (Rule) => Rule.required()
            }),
            defineField({
              name: 'note',
              title: 'Service Times Note',
              type: 'string',
              readOnly: true,
              initialValue: '📍 Service times are automatically pulled from Church Settings → Service Times. Only Sunday services are displayed on the visit page.',
              description: 'Service times are managed in the global Church Settings and automatically filtered to show Sunday services only.'
            })
          ]
        }),
        defineField({
          name: 'whatToExpect',
          title: 'What to Expect',
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              title: 'Section Title',
              type: 'string',
              initialValue: 'What to Expect',
              validation: (Rule) => Rule.required()
            }),
            defineField({
              name: 'items',
              title: 'Expectation Items',
              type: 'array',
              of: [
                {
                  type: 'object',
                  fields: [
                    defineField({
                      name: 'title',
                      title: 'Item Title',
                      type: 'string',
                      validation: (Rule) => Rule.required()
                    }),
                    defineField({
                      name: 'description',
                      title: 'Item Description',
                      type: 'text',
                      rows: 3,
                      validation: (Rule) => Rule.required()
                    }),
                    defineField({
                      name: 'icon',
                      title: 'Icon Name',
                      type: 'string',
                      // The Visit page renders these items with no icon (src/routes/visit/+page.svelte:200).
                      // Hidden rather than deleted so stored values survive; unhide if the page starts drawing one.
                      description: 'Not used. The Visit page does not show an icon for these items.',
                      hidden: true
                    })
                  ]
                }
              ],
              initialValue: [
                {
                  title: 'Casual Atmosphere',
                  description: 'Come as you are! We dress casually and focus on hearts, not appearances. You\'ll feel comfortable whether you\'re in jeans or your Sunday best.',
                  icon: 'users'
                },
                {
                  title: 'Friendly Greeters',
                  description: 'Our welcome team will greet you at the door, help you find your way around, and answer any questions you might have.',
                  icon: 'heart'
                },
                {
                  title: 'Worship & Teaching',
                  description: 'Our services include contemporary worship music and practical, biblical teaching that applies to everyday life.',
                  icon: 'book'
                },
                {
                  title: 'Kids Ministry',
                  description: 'Safe, fun, and age-appropriate programs for children during the service. Check-in process ensures security and peace of mind.',
                  icon: 'baby'
                }
              ],
              validation: (Rule) => Rule.min(1).error('Add at least one thing visitors can expect')
            })
          ]
        }),
        defineField({
          name: 'location',
          title: 'Location Information',
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              title: 'Location Title',
              type: 'string',
              initialValue: 'Find Us',
              validation: (Rule) => Rule.required()
            }),
            defineField({
              name: 'addressNote',
              title: 'Address & Maps Note',
              type: 'string',
              readOnly: true,
              initialValue: '📍 Address and Google Maps link are automatically pulled from Church Settings → Contact Information.',
              description: 'Address, phone number, and Google Maps directions are managed in the global Church Settings.'
            }),
            defineField({
              name: 'directions',
              title: 'Directions & Parking',
              type: 'text',
              rows: 4,
              initialValue: 'We\'re easy to find with plenty of free parking available. Look for the CRBC sign at the main entrance. Our greeters will be happy to help you find your way around.',
              description: 'Custom directions and parking information specific to first-time visitors',
              validation: (Rule) => Rule.required().error('The visit page shows this as the parking and directions text')
            })
          ]
        })
      ],
      group: 'planVisit'
    }),
    defineField({
      name: 'faq',
      title: 'FAQ Section',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'Section Title',
          type: 'string',
          initialValue: 'Frequently Asked Questions',
          validation: (Rule) => Rule.required().error('The visit page shows this as the FAQ heading')
        }),
        defineField({
          name: 'description',
          title: 'Section Description',
          type: 'text',
          rows: 2,
          initialValue: 'Have questions about visiting? We\'ve got answers. Can\'t find what you\'re looking for? Feel free to contact us directly.',
          validation: (Rule) => Rule.required()
        }),
        defineField({
          name: 'contactInfo',
          title: 'Contact Information',
          type: 'object',
          fields: [
            defineField({
              name: 'text',
              title: 'Contact Text',
              type: 'string',
              initialValue: 'contact our welcome team'
            }),
            defineField({
              name: 'href',
              title: 'Contact Link',
              type: 'string',
              initialValue: '/connect'
            }),
            defineField({
              name: 'openInPlanningCenterModal',
              title: 'Open in Planning Center Modal',
              type: 'boolean',
              description: 'If enabled, this link will open in a Planning Center modal instead of navigating to a new page',
              initialValue: true
            })
          ]
        }),
        defineField({
          name: 'questions',
          title: 'FAQ Items',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                defineField({
                  name: 'question',
                  title: 'Question',
                  type: 'string',
                  validation: (Rule) => Rule.required()
                }),
                defineField({
                  name: 'answer',
                  title: 'Answer',
                  type: 'text',
                  rows: 4,
                  validation: (Rule) => Rule.required()
                })
              ]
            }
          ],
          initialValue: [
            {
              question: 'What should I wear?',
              answer: 'Come as you are! We have a casual atmosphere where people wear everything from jeans and t-shirts to business attire. The most important thing is that you feel comfortable.'
            },
            {
              question: 'What about my children?',
              answer: 'We love kids! We have age-appropriate programs during our worship service for children from nursery through elementary age. Our children\'s ministry team provides a safe, fun environment where kids can learn about God\'s love.'
            },
            {
              question: 'How long is the service?',
              answer: 'Our Sunday morning worship service typically lasts about 75 minutes, including worship music, prayer, announcements, and the message. We start promptly at 10:00 AM.'
            },
            {
              question: 'Do I need to bring anything?',
              answer: 'Just bring yourself! We\'ll provide everything you need, including a Bible if you don\'t have one. Feel free to bring a notebook if you like to take notes during the message.'
            },
            {
              question: 'What if I\'m not a Christian?',
              answer: 'You\'re absolutely welcome! We believe church should be a place where people can explore faith and ask questions. There\'s no pressure - just come and see what we\'re all about.'
            },
            {
              question: 'Is there parking available?',
              answer: 'Yes! We have a large parking lot behind the church building with plenty of free parking spaces. Our greeters can help direct you if needed.'
            }
          ],
          validation: (Rule) => Rule.min(1).error('Add at least one question')
        })
      ],
      group: 'faq'
    })
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'hero.title'
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Visit Page',
        subtitle: subtitle || 'We\'re excited to meet you'
      }
    }
  }
})
