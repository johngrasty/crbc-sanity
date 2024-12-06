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
      name: 'seo',
      title: 'SEO & Metadata',
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

    // SEO
    defineField({
      name: 'seo',
      title: 'SEO Settings',
      type: 'object',
      group: 'seo',
      fields: [
        {
          name: 'title',
          title: 'Title',
          type: 'string',
          validation: Rule => Rule.required()
        },
        {
          name: 'description',
          title: 'Description',
          type: 'text',
          rows: 2,
          validation: Rule => Rule.required()
        },
        {
          name: 'image',
          title: 'Social Image',
          type: 'image',
          description: 'Used when sharing on social media'
        }
      ]
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