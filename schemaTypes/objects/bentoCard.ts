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
      rows: 3,
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { showLocationInfo?: boolean } | undefined;
          if (value || parent?.showLocationInfo) return true;
          return 'Add a description, or turn on Show location info.';
        })
    }),
    defineField({
      name: 'showLocationInfo',
      title: 'Show Location Info',
      type: 'boolean',
      description: 'Display contact information from settings (phone, address) in this card',
      initialValue: false
    }),
    defineField({
      name: 'image',
      title: 'Background Image',
      type: 'image',
      options: {
        hotspot: true,
        aiAssist: {
          imageDescriptionField: 'alt'
        }
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative Text',
          description: 'Describe what the image shows (10-125 characters). Should support the card\'s message. Use AI Assist (✨) to generate. See ALT_TEXT_GUIDE.md.',
          validation: (Rule) => Rule.required().min(10).max(125).error('Alt text is required (10-125 characters) for accessibility')
        }
      ],
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { componentType?: string } | undefined;
          if (value || parent?.componentType) return true;
          return 'Add a background image, or choose a component type for this card.';
        })
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
          name: 'useDirectionsLink',
          title: 'Use Directions Link',
          type: 'boolean',
          description: 'Generate directions link using address from settings',
          initialValue: false
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
        },
        {
          name: 'usePcoModal',
          title: 'Open in Planning Center Modal',
          type: 'boolean',
          description: 'Open this link in a Planning Center modal instead of navigating away',
          initialValue: false
        }
      ],
      validation: (Rule) =>
        Rule.custom((value) => {
          const button = value as { text?: string; href?: string; useDirectionsLink?: boolean } | undefined;
          if (!button?.text) return true;
          if (button.href || button.useDirectionsLink) return true;
          return 'Add a button link, or turn on Use directions link.';
        })
    }),
    defineField({
      name: 'showServiceTimes',
      title: 'Show Service Times',
      type: 'boolean',
      description: 'Display service times from settings in this card (makes it a ServiceTimesCard)',
      initialValue: false
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
      },
      validation: (Rule) => Rule.required().error('Pick a card width so the home page grid lays out correctly')
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
      showServiceTimes: 'showServiceTimes',
      showLocationInfo: 'showLocationInfo',
      componentType: 'componentType'
    },
    prepare({ title, eyebrow, media, showServiceTimes, componentType, showLocationInfo }) {
      let subtitle = eyebrow || '';
      
      if (showServiceTimes) {
        subtitle += ' • Service Times Card';
      }
      
      if (showLocationInfo) {
        subtitle += ' • Location Card';
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
