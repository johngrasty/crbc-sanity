import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {media} from 'sanity-plugin-media'
import {assist} from '@sanity/assist'
import {schemaTypes} from './schemaTypes'
import {deskStructure} from './structure/deskStructure'
import {PreviewAction} from './structure/documentActions'
import {singletonActions, singletonTypes} from './structure/singletons'
import {previewableTypes, previewOrigin, singletonPaths} from './structure/preview'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET
if (!projectId) throw new Error('Missing required environment variable: SANITY_STUDIO_PROJECT_ID')
if (!dataset) throw new Error('Missing required environment variable: SANITY_STUDIO_DATASET')

export default defineConfig({
  name: 'default',
  title: 'CRBC',
  projectId,
  dataset,
  plugins: [structureTool({structure: deskStructure}), visionTool(), media(), assist()],
  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter(({schemaType}) => !singletonTypes.has(schemaType)),
  },
  document: {
    actions: (input, context) => {
      if (singletonTypes.has(context.schemaType)) {
        return input.filter(({action}) => action && singletonActions.has(action))
      }
      return previewableTypes.has(context.schemaType) ? [...input, PreviewAction] : input
    },
    // Studio re-resolves productionUrl on every debounced form change, so it must
    // never mint a preview secret here (that writes to the dataset on each pause in
    // typing). Slugged types get a secret only when the Preview action is clicked.
    productionUrl: async (prev, {document}) => {
      const path = singletonPaths[document._type]
      return path ? new URL(path, previewOrigin).toString() : prev
    },
  },
})
