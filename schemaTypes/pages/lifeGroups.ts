import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'lifeGroupsPage',
  title: 'Life Groups Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Page Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
      initialValue: 'Life Groups',
    }),
    defineField({
      name: 'heading',
      title: 'Hero Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
      initialValue: 'Life Groups',
    }),
    defineField({
      name: 'lead',
      title: 'Hero Lead Text',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
      initialValue:
        'Connect with others and grow in your faith through our Sunday School classes. Find a group that fits your stage of life and interests.',
    }),
    defineField({
      name: 'footerNote',
      title: 'Footer Note',
      type: 'text',
      rows: 3,
      description: 'Note displayed at the bottom about kids and students classes',
      validation: (Rule) => Rule.required(),
      initialValue:
        'Looking for classes for kids or students? Check out our Kids Ministry and Student Ministry pages.',
    }),
    defineField({
      name: 'kidsMinistryLink',
      title: 'Kids Ministry Link',
      type: 'string',
      validation: (Rule) => Rule.required(),
      initialValue: '/ministries/kids',
    }),
    defineField({
      name: 'studentsMinistryLink',
      title: 'Students Ministry Link',
      type: 'string',
      validation: (Rule) => Rule.required(),
      initialValue: '/ministries/students',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      fields: [
        {
          name: 'title',
          title: 'SEO Title',
          type: 'string',
          validation: (Rule) => Rule.max(60),
        },
        {
          name: 'description',
          title: 'SEO Description',
          type: 'text',
          rows: 3,
          validation: (Rule) => Rule.max(160),
        },
      ],
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Life Groups Page',
      };
    },
  },
});
