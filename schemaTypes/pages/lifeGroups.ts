import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'lifeGroupsPage',
  title: 'Life Groups Page',
  type: 'document',
  fields: [
    // Retain definitions for stored values retired from the website.
    defineField({
      name: 'footerNote',
      type: 'text',
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: 'kidsMinistryLink',
      type: 'string',
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: 'studentsMinistryLink',
      type: 'string',
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: 'pcoGroupTypeName',
      title: 'Planning Center Group Type',
      type: 'string',
      description:
        'Copy the group type name exactly as it appears in Planning Center Groups. Only groups of this type appear on this page.',
      initialValue: 'Sunday School Classes',
      validation: (Rule) =>
        Rule.required().custom(
          (value) => !value || value === value.trim() || 'Remove spaces at the beginning or end',
        ),
    }),
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
      }
    },
  },
})
