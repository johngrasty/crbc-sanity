import {defineType} from 'sanity'
import {PCOEventPicker} from '../components/PCOEventPicker'

export default defineType({
  name: 'featuredEvent',
  title: 'Featured Event',
  type: 'document',
  icon: () => '🎉',
  fields: [
    {
      name: 'title',
      title: 'Event Title',
      type: 'string',
      description: 'Name of the event (can be auto-filled from PCO)',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-friendly identifier for this event',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'pcoEvent',
      title: 'Planning Center Event',
      type: 'object',
      description: 'Connect to a Planning Center Online event',
      components: {
        input: PCOEventPicker,
      },
      fields: [
        {
          name: 'eventId',
          title: 'Event ID',
          type: 'string',
          description: 'PCO Calendar Event ID',
        },
        {
          name: 'eventType',
          title: 'Event Type',
          type: 'string',
          options: {
            list: [
              {title: 'Calendar Event', value: 'calendar'},
              {title: 'Registration', value: 'registration'},
            ],
          },
          initialValue: 'calendar',
        },
        {
          name: 'lastSynced',
          title: 'Last Synced',
          type: 'datetime',
          description: 'When event data was last fetched from PCO',
          readOnly: true,
        },
      ],
      options: {
        collapsible: true,
        collapsed: false,
      },
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      description: 'Brief description of the event (for display on homepage/cards)',
    },
    {
      name: 'fullContent',
      title: 'Full Content',
      type: 'array',
      of: [{type: 'block'}, {type: 'image'}],
      description: 'Optional rich content for dedicated event page',
    },
    {
      name: 'date',
      title: 'Event Date & Time',
      type: 'datetime',
      description: 'When the event starts (copy from PCO event if available)',
    },
    {
      name: 'endDate',
      title: 'End Date & Time',
      type: 'datetime',
      description: 'When the event ends (optional)',
    },
    {
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'Where the event takes place',
    },
    {
      name: 'registrationMethod',
      title: 'Registration Method',
      type: 'string',
      options: {
        list: [
          {title: 'Planning Center (Modal)', value: 'pco-modal'},
          {title: 'Planning Center (Direct Link)', value: 'pco-link'},
          {title: 'Planning Center (Embedded Form)', value: 'pco-embed'},
          {title: 'External Link', value: 'external'},
          {title: 'No Registration', value: 'none'},
        ],
        layout: 'radio',
      },
      initialValue: 'pco-modal',
    },
    {
      name: 'registrationUrl',
      title: 'Registration URL',
      type: 'url',
      description: 'Link to registration page or form',
      hidden: ({parent}) => parent?.registrationMethod === 'none',
      validation: (Rule) =>
        Rule.uri({
          scheme: ['http', 'https'],
        }),
    },
    {
      name: 'embedCode',
      title: 'Embed Code',
      type: 'text',
      rows: 5,
      description: 'HTML embed code for registration form',
      hidden: ({parent}) => parent?.registrationMethod !== 'pco-embed',
    },
    {
      name: 'registrationDeadline',
      title: 'Registration Deadline',
      type: 'datetime',
      description: 'Last date to register for this event',
    },
    {
      name: 'maxAttendees',
      title: 'Maximum Attendees',
      type: 'number',
      description: 'Maximum number of people who can register',
    },
    {
      name: 'currentAttendees',
      title: 'Current Attendees',
      type: 'number',
      description: 'Number of people currently registered (auto-updated from PCO)',
      readOnly: true,
    },
    {
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'image',
      description: 'Main image for the event (1200x600px recommended)',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          description: 'Describe the image for accessibility',
        },
      ],
    },
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          {title: 'Worship Service', value: 'worship'},
          {title: 'Special Event', value: 'event'},
          {title: 'Ministry Event', value: 'ministry'},
          {title: 'Volunteer Opportunity', value: 'volunteer'},
          {title: 'Community Outreach', value: 'outreach'},
          {title: 'Youth & Children', value: 'youth'},
        ],
      },
    },
    {
      name: 'relatedMinistry',
      title: 'Related Ministry',
      type: 'reference',
      to: [{type: 'ministry'}],
      description: 'Link this event to a specific ministry',
    },
    {
      name: 'displayOnHomepage',
      title: 'Display on Homepage',
      type: 'boolean',
      description: 'Show this event in the homepage featured events section',
      initialValue: false,
    },
    {
      name: 'featured',
      title: 'Featured Event',
      type: 'boolean',
      description: 'Mark as featured (appears first in lists)',
      initialValue: false,
    },
    {
      name: 'active',
      title: 'Active',
      type: 'boolean',
      description: 'Make this event visible on the website',
      initialValue: true,
    },
  ],
  preview: {
    select: {
      title: 'title',
      date: 'date',
      media: 'featuredImage',
      displayOnHomepage: 'displayOnHomepage',
      featured: 'featured',
      active: 'active',
      category: 'category',
    },
    prepare({title, date, media, displayOnHomepage, featured, active, category}) {
      const badges = []

      if (featured) badges.push('⭐')
      if (displayOnHomepage) badges.push('🏠')
      if (!active) badges.push('💤')

      const formattedDate = date
        ? new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'No date'

      return {
        title: `${badges.join(' ')} ${title}`,
        subtitle: `${formattedDate}${category ? ` • ${category}` : ''}`,
        media,
      }
    },
  },
  orderings: [
    {
      title: 'Date (Newest First)',
      name: 'dateDesc',
      by: [{field: 'date', direction: 'desc'}],
    },
    {
      title: 'Date (Oldest First)',
      name: 'dateAsc',
      by: [{field: 'date', direction: 'asc'}],
    },
    {
      title: 'Featured First',
      name: 'featuredFirst',
      by: [
        {field: 'featured', direction: 'desc'},
        {field: 'date', direction: 'desc'},
      ],
    },
  ],
})
