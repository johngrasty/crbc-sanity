import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {media} from 'sanity-plugin-media'
import {schemaTypes} from './schemaTypes'
import {deskStructure} from './structure/deskStructure'

export default defineConfig({
  name: 'default',
  title: 'CRBC',

  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET!,

  plugins: [
    structureTool({
      structure: deskStructure
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
