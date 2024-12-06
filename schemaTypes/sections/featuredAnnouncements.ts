import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'featuredAnnouncements',
  title: 'Featured Announcements',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Section Heading',
      type: 'string',
      initialValue: 'Church Announcements'
    }),
    defineField({
      name: 'announcements',
      title: 'Featured Announcements',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'announcement' }]
        }
      ],
      validation: Rule => Rule.max(3)
    }),
    defineField({
      name: 'viewAllLink',
      title: 'View All Link',
      type: 'string',
      initialValue: '/announcements'
    })
  ],
  preview: {
    select: {
      title: 'heading'
    },
    prepare({ title }) {
      return {
        title: title || 'Featured Announcements'
      };
    }
  }
}); 