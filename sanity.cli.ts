import {defineCliConfig} from 'sanity/cli'
import {config} from 'dotenv'

// Load environment variables
config()

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET

if (!projectId) {
  throw new Error('Missing required environment variable: SANITY_STUDIO_PROJECT_ID')
}

if (!dataset) {
  throw new Error('Missing required environment variable: SANITY_STUDIO_DATASET')
}

export default defineCliConfig({
  api: {
    projectId,
    dataset
  },
  /**
   * Enable auto-updates for studios.
   * Learn more at https://www.sanity.io/docs/cli#auto-updates
   */
  autoUpdates: true,
})
