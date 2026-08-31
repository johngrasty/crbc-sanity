import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'designTokens',
  title: 'Design Tokens',
  type: 'document',
  groups: [
    {
      name: 'gradients',
      title: 'Gradients',
    },
  ],
  fields: [
    defineField({
      name: 'gradients',
      title: 'Gradient Settings',
      type: 'object',
      group: 'gradients',
      description: 'Define the gradient colors used throughout the site',
      fields: [
        {
          name: 'primary',
          title: 'Primary Gradient',
          type: 'object',
          description: 'Colors for the primary section gradient',
          fields: [
            {
              name: 'from',
              title: 'From Color',
              type: 'string',
              description: 'Starting color (hex code with optional #, e.g. fff1be or #fff1be)',
              initialValue: 'fff1be',
            },
            {
              name: 'via',
              title: 'Via Color',
              type: 'string',
              description: 'Middle color (hex code with optional #, e.g. ee87cb or #ee87cb)',
              initialValue: 'ee87cb',
            },
            {
              name: 'to',
              title: 'To Color',
              type: 'string',
              description: 'Ending color (hex code with optional #, e.g. b060ff or #b060ff)',
              initialValue: 'b060ff',
            },
          ],
        },
        {
          name: 'footer',
          title: 'Footer Gradient',
          type: 'object',
          description: 'Colors for the footer section gradient',
          fields: [
            {
              name: 'from',
              title: 'From Color',
              type: 'string',
              description: 'Starting color (hex code with optional #, e.g. fff1be or #fff1be)',
              initialValue: 'fff1be',
            },
            {
              name: 'via',
              title: 'Via Color',
              type: 'string',
              description: 'Middle color (hex code with optional #, e.g. ee87cb or #ee87cb)',
              initialValue: 'ee87cb',
            },
            {
              name: 'to',
              title: 'To Color',
              type: 'string',
              description: 'Ending color (hex code with optional #, e.g. b060ff or #b060ff)',
              initialValue: 'b060ff',
            },
          ],
        },
      ],
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Design Tokens',
      }
    },
  },
})
