import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'siteAlert',
  title: 'Site Alert',
  type: 'document',
  description:
    'One banner shown at the top of every page. Turn it on for weather closures or urgent notices, turn it off when the notice is over.',
  fields: [
    defineField({
      name: 'enabled',
      title: 'Show the alert on the website',
      type: 'boolean',
      description: 'Off by default. Turn on and publish to display the banner; turn off and publish to remove it.',
      initialValue: false
    }),
    defineField({
      name: 'message',
      title: 'Alert Message',
      type: 'text',
      rows: 2,
      description: 'Keep it to one or two sentences, e.g. "Sunday services are cancelled due to snow."',
      validation: (Rule) => Rule.required().max(300).warning('Long messages wrap onto several lines on phones')
    }),
    defineField({
      name: 'type',
      title: 'Alert Colour',
      type: 'string',
      options: {
        list: [
          { title: 'Info (Maroon)', value: 'info' },
          { title: 'Warning (Yellow)', value: 'warning' },
          { title: 'Alert (Bright Red)', value: 'alert' }
        ],
        layout: 'radio'
      },
      initialValue: 'info',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'link',
      title: 'Link for more information',
      type: 'url',
      description: 'Optional. A page on this site like /connect, or a full address like https://...',
      validation: (Rule) =>
        Rule.uri({ scheme: ['http', 'https', 'mailto', 'tel'], allowRelative: true })
    })
  ],
  preview: {
    select: {
      title: 'message',
      enabled: 'enabled',
      type: 'type'
    },
    prepare({ title, enabled, type }) {
      return {
        title: title || 'No message set',
        subtitle: `${enabled ? 'Showing on site' : 'Hidden'} - ${type?.toUpperCase() || 'No colour set'}`
      };
    }
  }
});
