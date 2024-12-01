import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {media} from 'sanity-plugin-media'
import {schemaTypes} from './schemaTypes'
import {deskStructure} from './structure/deskStructure'

// Validate required environment variables
const requiredEnvs = {
  projectId: process.env.SANITY_STUDIO_PROJECT_ID,
  dataset: process.env.SANITY_STUDIO_DATASET
} as const;

// Validate before use
Object.entries(requiredEnvs).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

// After validation, we can safely assert these are strings
const projectId = requiredEnvs.projectId as string;
const dataset = requiredEnvs.dataset as string;

export default defineConfig({
  name: 'default',
  title: 'CRBC',

  projectId,
  dataset,

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
