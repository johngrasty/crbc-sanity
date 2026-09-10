import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'givingPage',
  title: 'Giving Page',
  type: 'document',
  groups: [
    {
      name: 'hero',
      title: 'Hero',
      default: true
    },
    {
      name: 'onlineGiving',
      title: 'Give online'
    },
    {
      name: 'givingOptions',
      title: 'Other ways to give'
    },
    {
      name: 'whyGive',
      title: 'Why we give'
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
      initialValue: 'Give',
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
          initialValue: 'Give - Support Our Mission'
        }),
        defineField({
          name: 'description',
          title: 'SEO Description',
          type: 'text',
          rows: 2,
          initialValue: 'Partner with us in God\'s work through your generous giving. Support our ministries, missions, and community outreach.'
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
          name: 'tagline',
          title: 'Tagline',
          type: 'string',
          initialValue: 'Generous hearts, faithful giving'
        }),
        defineField({
          name: 'title',
          title: 'Main Title',
          type: 'string',
          initialValue: 'Partner with God\'s Work',
          validation: (Rule) => Rule.required()
        }),
        defineField({
          name: 'description',
          title: 'Description',
          type: 'text',
          rows: 3,
          initialValue: 'Your generosity helps us share Christ\'s love, serve our community, and support those in need. Every gift makes an eternal difference.',
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
              initialValue: 'Give Online Now'
            }),
            defineField({
              name: 'href',
              title: 'Button Target (anchor)',
              type: 'string',
              initialValue: '#online-giving'
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
              initialValue: 'Other Ways to Give'
            }),
            defineField({
              name: 'href',
              title: 'Button Target (anchor)',
              type: 'string',
              initialValue: '#giving-options'
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
              validation: (Rule) => Rule.required().error('Describe this photo for screen readers')
            })
          ],
          validation: (Rule) => Rule.required()
        })
      ],
      group: 'hero'
    }),
    defineField({
      name: 'onlineGiving',
      title: 'Online Giving Section',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'Section Title',
          type: 'string',
          initialValue: 'Give Online',
          validation: (Rule) => Rule.required()
        }),
        defineField({
          name: 'description',
          title: 'Section Description',
          type: 'text',
          rows: 2,
          initialValue: 'Secure, convenient online giving through our trusted partner Subsplash.',
          validation: (Rule) => Rule.required()
        }),
        defineField({
          name: 'subsplashEmbedCode',
          title: 'Subsplash Embed Code',
          type: 'text',
          rows: 5,
          description: 'Paste the full embed code from Subsplash here',
          validation: (Rule) =>
            Rule.required().error('The giving page cannot show the online giving form without this')
        })
      ],
      group: 'onlineGiving'
    }),
    defineField({
      name: 'givingOptions',
      title: 'Other Giving Methods',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'Section Title',
          type: 'string',
          initialValue: 'Other Ways to Give',
          validation: (Rule) => Rule.required()
        }),
        defineField({
          name: 'description',
          title: 'Section Description',
          type: 'text',
          rows: 2,
          initialValue: 'We offer several convenient ways for you to support our ministry.',
          validation: (Rule) => Rule.required()
        }),
        defineField({
          name: 'methods',
          title: 'Giving Methods',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                defineField({
                  name: 'title',
                  title: 'Method Title',
                  type: 'string',
                  validation: (Rule) => Rule.required()
                }),
                defineField({
                  name: 'description',
                  title: 'Method Description',
                  type: 'text',
                  rows: 3,
                  validation: (Rule) => Rule.required()
                }),
                defineField({
                  name: 'icon',
                  title: 'Icon Name',
                  type: 'string',
                  // The Give page renders these methods with no icon (src/routes/give/+page.svelte:260).
                  // Hidden rather than deleted so stored values survive; unhide if the page starts drawing one.
                  description: 'Not used. The Give page does not show an icon for these methods.',
                  hidden: true
                })
              ]
            }
          ],
          initialValue: [
            {
              title: 'Mail a Check',
              description: 'Send your check payable to "CRBC" to:\n123 Church Street\nYour City, State 12345',
              icon: 'mail'
            },
            {
              title: 'Bank Transfer',
              description: 'Set up automatic giving through your bank\'s bill pay service or contact us for ACH details.',
              icon: 'bank'
            },
            {
              title: 'In Person',
              description: 'Place your gift in the offering during Sunday service or visit our church office during business hours.',
              icon: 'church'
            },
            {
              title: 'Stock & Securities',
              description: 'Donate appreciated assets for potential tax benefits. Contact our office for transfer instructions.',
              icon: 'chart'
            }
          ],
          validation: (Rule) => Rule.min(1).error('Add at least one giving method')
        })
      ],
      group: 'givingOptions'
    }),
    defineField({
      name: 'whyGive',
      title: 'Why We Give Section',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'Section Title',
          type: 'string',
          initialValue: 'Why We Give',
          validation: (Rule) => Rule.required()
        }),
        defineField({
          name: 'description',
          title: 'Section Description',
          type: 'text',
          rows: 4,
          initialValue: 'Giving is an act of worship and obedience to God. It allows us to participate in His work and demonstrates our trust in His provision. Through your generous gifts, we can continue to serve our community, support missions, and care for those in need.',
          validation: (Rule) => Rule.required()
        }),
        defineField({
          name: 'scriptureVerse',
          title: 'Scripture Verse',
          type: 'object',
          fields: [
            defineField({
              name: 'text',
              title: 'Verse Text',
              type: 'text',
              rows: 3,
              initialValue: 'Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.'
            }),
            defineField({
              name: 'reference',
              title: 'Scripture Reference',
              type: 'string',
              initialValue: '2 Corinthians 9:7'
            }),
            defineField({
              name: 'version',
              title: 'Bible Version',
              type: 'string',
              initialValue: 'NIV'
            })
          ]
        })
      ],
      group: 'whyGive'
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
          validation: (Rule) => Rule.required()
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
                  rows: 3,
                  validation: (Rule) => Rule.required()
                })
              ]
            }
          ],
          initialValue: [
            {
              question: 'Is my online gift secure?',
              answer: 'Yes, we use Subsplash\'s secure platform with bank-level encryption to protect your personal and financial information.'
            },
            {
              question: 'Will I receive a tax receipt?',
              answer: 'Yes, you will receive a tax-deductible receipt for all gifts. Online gifts receive immediate email receipts, and annual statements are provided in January.'
            },
            {
              question: 'Can I set up recurring gifts?',
              answer: 'Absolutely! You can set up weekly, bi-weekly, or monthly recurring gifts through our online giving platform.'
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
        title: title || 'Giving Page',
        subtitle: subtitle || 'Partner with God\'s Work'
      }
    }
  }
})
