import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'bentoCard',
  title: 'Bento Card',
  type: 'object',
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow Text',
      type: 'string'
    }),
    defineField({
      name: 'title',
      title: 'Card Title',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3
    }),
    defineField({
      name: 'image',
      title: 'Background Image',
      type: 'image',
      options: {
        hotspot: true
      }
    }),
    defineField({
      name: 'button',
      title: 'Call to Action Button',
      type: 'object',
      fields: [
        {
          name: 'text',
          title: 'Button Text',
          type: 'string'
        },
        {
          name: 'href',
          title: 'Button Link',
          type: 'string'
        },
        {
          name: 'variant',
          title: 'Button Style',
          type: 'string',
          options: {
            list: [
              { title: 'Primary', value: 'primary' },
              { title: 'Outlined', value: 'outlined' },
              { title: 'Secondary', value: 'secondary' }
            ]
          },
          initialValue: 'primary'
        },
        {
          name: 'target',
          title: 'Link Target',
          type: 'string',
          options: {
            list: [
              { title: 'Same Window', value: '_self' },
              { title: 'New Window', value: '_blank' }
            ]
          },
          initialValue: '_self'
        }
      ]
    }),
    defineField({
      name: 'serviceTimes',
      title: 'Service Times',
      type: 'array',
      description: 'Add service times to make this a ServiceTimesCard',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'day',
              title: 'Day',
              type: 'string',
              validation: Rule => Rule.required()
            },
            {
              name: 'time',
              title: 'Time',
              type: 'string',
              validation: Rule => Rule.required()
            },
            {
              name: 'description',
              title: 'Description',
              type: 'string',
              validation: Rule => Rule.required()
            }
          ],
          preview: {
            select: {
              day: 'day',
              time: 'time',
              description: 'description'
            },
            prepare({ day, time, description }) {
              return {
                title: `${day} ${time}`,
                subtitle: description
              };
            }
          }
        }
      ]
    }),
    defineField({
      name: 'componentType',
      title: 'Component Type',
      type: 'string',
      description: 'Select a special component to render in this card',
      options: {
        list: [
          { title: 'None', value: '' },
          { title: 'Linked Avatars', value: 'linkedAvatars' },
          { title: 'Custom Component', value: 'custom' }
        ]
      }
    }),
    defineField({
      name: 'class',
      title: 'CSS Classes',
      type: 'string',
      description: 'Additional CSS classes for layout (e.g., lg:col-span-3, lg:col-span-2)',
      options: {
        list: [
          { title: 'Large (3 columns)', value: 'lg:col-span-3' },
          { title: 'Medium (2 columns)', value: 'lg:col-span-2' },
          { title: 'Small (1 column)', value: 'lg:col-span-1' }
        ]
      }
    }),
    defineField({
      name: 'dark',
      title: 'Dark Theme',
      type: 'boolean',
      description: 'Use dark theme for this card',
      initialValue: false
    }),
    defineField({
      name: 'fade',
      title: 'Fade Effects',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Top', value: 'top' },
          { title: 'Bottom', value: 'bottom' }
        ]
      }
    })
  ],
  preview: {
    select: {
      title: 'title',
      eyebrow: 'eyebrow',
      media: 'image',
      hasServiceTimes: 'serviceTimes',
      componentType: 'componentType'
    },
    prepare({ title, eyebrow, media, hasServiceTimes, componentType }) {
      let subtitle = eyebrow || '';
      
      if (hasServiceTimes && hasServiceTimes.length > 0) {
        subtitle += ' • Service Times Card';
      }
      
      if (componentType && componentType !== '') {
        subtitle += ` • ${componentType}`;
      }
      
      return {
        title: title,
        subtitle: subtitle,
        media: media
      };
    }
  }
});
