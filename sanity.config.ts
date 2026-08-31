import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {media} from 'sanity-plugin-media'
import {assist} from '@sanity/assist'
import {schemaTypes} from './schemaTypes'
import {deskStructure} from './structure/deskStructure'
import {PreviewAction} from './structure/documentActions'
import {SINGLETON_TYPES} from './structure/singletons'

// Validate required environment variables
const requiredEnvs = {
  projectId: process.env.SANITY_STUDIO_PROJECT_ID,
  dataset: process.env.SANITY_STUDIO_DATASET,
} as const

// Validate before use
Object.entries(requiredEnvs).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
})

// After validation, we can safely assert these are strings
const projectId = requiredEnvs.projectId as string
const dataset = requiredEnvs.dataset as string

export default defineConfig({
  name: 'default',
  title: 'CRBC',

  projectId,
  dataset,

  plugins: [
    structureTool({
      structure: deskStructure,
    }),
    visionTool(),
    media(),
    assist(),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (input, context) => {
      let actions = input

      if (context.schemaType === 'registration') {
        return actions.filter(({action}) => action === 'delete' || action === 'discardChanges')
      }

      const canonicalDocumentId = context.documentId.replace(/^drafts\./, '')
      if (SINGLETON_TYPES.has(context.schemaType)) {
        const isCanonicalSingleton = canonicalDocumentId === context.schemaType
        actions = actions.filter(({action}) => {
          if (action === 'duplicate') return false
          if (isCanonicalSingleton && (action === 'delete' || action === 'unpublish')) return false
          return true
        })
      }

      // Add preview action for previewable types
      const previewableTypes = ['announcement', 'ministry', 'article', 'page']
      if (previewableTypes.includes(context.schemaType)) {
        return [...actions, PreviewAction]
      }

      return actions
    },

    // Singleton documents are opened through fixed-id Structure panes. Keep
    // them out of Sanity's global Create menu so duplicate ids cannot be made.
    newDocumentOptions: (input, context) => {
      return input.filter(({templateId}) => {
        if (templateId === 'registration') return false
        return context.creationContext.type !== 'global' || !SINGLETON_TYPES.has(templateId)
      })
    },

    // Preview configuration for announcements
    productionUrl: async (prev, context) => {
      const {document} = context
      const previewUrl = process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:5173'

      // Handle announcement previews
      if (document._type === 'announcement') {
        const slug = (document.slug as any)?.current
        if (slug) {
          return `${previewUrl}/api/preview?type=announcement&slug=${slug}`
        }
      }

      // Handle ministry previews
      if (document._type === 'ministry') {
        const slug = (document.slug as any)?.current
        if (slug) {
          return `${previewUrl}/ministries/${slug}`
        }
      }

      // Handle page previews
      if (document._type === 'page') {
        const slug = (document.slug as any)?.current
        if (slug) {
          return `${previewUrl}/${slug}`
        }
      }

      // Default to homepage for singleton pages
      if (
        [
          'homePage',
          'aboutPage',
          'beliefsPage',
          'givingPage',
          'visitPage',
          'connectPage',
          'watchPage',
        ].includes(document._type)
      ) {
        const pageMap: Record<string, string> = {
          homePage: '',
          aboutPage: 'about',
          beliefsPage: 'beliefs',
          givingPage: 'giving',
          visitPage: 'visit',
          connectPage: 'connect',
          watchPage: 'watch',
        }
        const path = pageMap[document._type] || ''
        return `${previewUrl}/${path}`
      }

      return prev
    },
  },
})
