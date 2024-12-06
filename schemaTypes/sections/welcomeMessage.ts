import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'welcomeMessage',
  title: 'Welcome Message',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Welcome to Our Church'
    }),
    defineField({
      name: 'message',
      title: 'Welcome Message',
      type: 'array',
      of: [{ type: 'block' }]
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {
        hotspot: true
      }
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
          initialValue: 'Learn More'
        },
        {
          name: 'link',
          title: 'Button Link',
          type: 'string',
          initialValue: '/about'
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