import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'serviceInfo',
  title: 'Service Information',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Section Heading',
      type: 'string',
      initialValue: 'Join Us for Worship'
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2
    }),
    defineField({
      name: 'services',
      title: 'Service Times',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'day',
              title: 'Day',
              type: 'string',
              options: {
                list: [
                  'Sunday',
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday'
                ]
              }
            },
            {
              name: 'time',
              title: 'Time',
              type: 'string'
            },
            {
              name: 'name',
              title: 'Service Name',
              type: 'string'
            },
            {
              name: 'description',
              title: 'Description',
              type: 'text',
              rows: 2
            }
          ],
          preview: {
            select: {
              day: 'day',
              time: 'time',
              name: 'name'
            },
            prepare({ day, time, name }) {
              return {
                title: `${day} - ${time}`,
                subtitle: name
              };
            }
          }
        }
      ]
    }),
    defineField({
      name: 'locationInfo',
      title: 'Location Information',
      type: 'object',
      fields: [
        {
          name: 'address',
          title: 'Address',
          type: 'text',
          rows: 2
        },
        {
          name: 'mapLink',
          title: 'Map Link',
          type: 'url',
          description: 'Link to Google Maps or similar'
        }
      ]
    }),
    defineField({
      name: 'cta',
      title: 'Call to Action',
      type: 'object',
      fields: [
        {
          name: 'text',
          title: 'Button Text',
          type: 'string',
          initialValue: 'Plan Your Visit'
        },
        {
          name: 'link',
          title: 'Button Link',
          type: 'string',
          initialValue: '/visit'
        }
      ]
    })
  ],
  preview: {
    select: {
      title: 'heading'
    }
  }
}); 