import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {media} from 'sanity-plugin-media'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'CRBC',

  projectId: '3jz4fi70',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            // Singleton for church settings
            S.listItem()
              .title('Church Settings')
              .id('settings')
              .child(S.document().schemaType('settings').documentId('settings')),
            // Regular document types
            S.documentTypeListItem('page').title('Pages'),
            S.documentTypeListItem('staff').title('Staff & Leadership'),
            S.documentTypeListItem('announcement').title('Announcements'),
            // Group navigation items
            S.listItem()
              .title('Navigation Menus')
              .child(S.documentTypeList('navigation').title('Navigation Menus')),
          ])
    }),
    visionTool(),
    media()
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    // For church settings - only allow one instance
    actions: (input, context) => {
      if (context.schemaType === 'settings') {
        return input.filter(({ action }) => action && !['delete', 'duplicate'].includes(action));
      }
      return input;
    }
  }
})
