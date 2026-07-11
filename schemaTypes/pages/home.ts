import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  // Singleton: creation/deletion is blocked via document.actions and
  // newDocumentOptions in sanity.config.ts
  groups: [
    {
      name: 'hero',
      title: 'Hero Section',
    },
    {
      name: 'announcements',
      title: 'Announcements',
    },
    {
      name: 'bento',
      title: 'Bento Section',
    },
    {
      name: 'partners',
      title: 'Ministries & Partners',
    }
  ],
  fields: [
    // Hero Section
    defineField({
      name: 'hero',
      title: 'Hero Section',
      type: 'hero',
      group: 'hero',
      validation: Rule => Rule.required()
    }),

    // Announcements Settings
    defineField({
      name: 'showAnnouncementText',
      title: 'Show Text Overlay on Announcements',
      type: 'boolean',
      description: 'Display title and description overlay on announcement carousel slides. Usually disabled when reusing slides from church services.',
      initialValue: false,
      group: 'announcements'
    }),

    // Bento Section
    defineField({
      name: 'bentoSection',
      title: 'Bento Section',
      type: 'object',
      group: 'bento',
      fields: [
        {
          name: 'heading',
          title: 'Section Heading',
          type: 'string',
          validation: Rule => Rule.required()
        },
        {
          name: 'subheading',
          title: 'Section Subheading',
          type: 'string'
        },
        {
          name: 'cards',
          title: 'Bento Cards',
          type: 'array',
          of: [{ type: 'bentoCard' }],
          validation: Rule => Rule.min(1).max(6)
        }
      ]
    }),

    // Logo Cloud Section
    defineField({
      name: 'logoCloud',
      title: 'Ministries & Partners Logo Cloud',
      type: 'logoCloud',
      group: 'partners'
    })
  ],
  preview: {
    prepare() {
      return {
        title: 'Home Page'
      };
    }
  }
}); 