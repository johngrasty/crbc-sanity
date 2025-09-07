import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  // @ts-expect-error - Sanity's experimental actions are not yet typed
  __experimental_actions: ['update', 'publish'],
  groups: [
    {
      name: 'hero',
      title: 'Hero Section',
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