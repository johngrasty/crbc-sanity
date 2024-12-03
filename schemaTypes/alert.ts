import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'siteAlert',
  title: 'Site Alert',
  type: 'document',
  groups: [
    {
      name: 'content',
      title: 'Content',
    },
    {
      name: 'settings',
      title: 'Settings',
    }
  ],
  fields: [
    defineField({
      name: 'enabled',
      title: 'Enable Alert',
      type: 'boolean',
      group: 'settings',
      initialValue: false
    }),
    defineField({
      name: 'message',
      title: 'Alert Message',
      type: 'text',
      group: 'content',
      rows: 2,
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'type',
      title: 'Alert Type',
      type: 'string',
      group: 'settings',
      options: {
        list: [
          { title: 'Info', value: 'info' },
          { title: 'Warning', value: 'warning' },
          { title: 'Error', value: 'error' }
        ]
      },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'link',
      title: 'Alert Link',
      type: 'string',
      group: 'content',
      description: 'Optional link for more information'
    })
  ],
  preview: {
    select: {
      title: 'message',
      enabled: 'enabled',
      type: 'type'
    },
    prepare({ title, enabled, type }) {
      return {
        title: title || 'No message set',
        subtitle: `${enabled ? 'Enabled' : 'Disabled'} - ${type?.toUpperCase() || 'No type set'}`
      };
    }
  }
}); 