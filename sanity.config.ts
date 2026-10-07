import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {media} from 'sanity-plugin-media'
import {assist} from '@sanity/assist'
import {schemaTypes} from './schemaTypes'
import {deskStructure} from './structure/deskStructure'
import {
  documentActions,
  formComponents,
  newDocumentOptions,
  releases,
  templates,
} from './structure/documentConfig'
import {previewOrigin, singletonPaths} from './structure/preview'

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
  schema: {types: schemaTypes, templates},
  form: {components: formComponents},
  releases,
  document: {
    actions: documentActions,
    newDocumentOptions,
    // Studio re-resolves productionUrl on every debounced form change, so it must
    // never mint a preview secret here (that writes to the dataset on each pause in
    // typing). Slugged types get a secret only when the Preview action is clicked.
    productionUrl: async (prev, {document}) => {
      const path = singletonPaths[document._type]
      return path ? new URL(path, previewOrigin).toString() : prev
    },
  },
})
