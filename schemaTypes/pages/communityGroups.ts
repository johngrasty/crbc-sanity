import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'communityGroupsPage',
  title: 'Community Groups Page',
  type: 'document',
  fields: [
    defineField({
      name: 'pcoGroupTypeName',
      title: 'Planning Center Group Type',
      type: 'string',
      description:
        'Copy the group type name exactly as it appears in Planning Center Groups. Only groups of this type appear on this page.',
      initialValue: 'Community Groups',
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
      initialValue: 'Community Groups',
    }),
    defineField({
      name: 'heading',
      title: 'Hero Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
      initialValue: 'Community Groups',
    }),
    defineField({
      name: 'lead',
      title: 'Hero Lead Text',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
      initialValue:
        'Connect with others and grow in your faith through our Community Groups. Find a group that fits your stage of life and interests.',
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
        title: 'Community Groups Page',
      }
    },
  },
})
