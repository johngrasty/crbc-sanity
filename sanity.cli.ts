import {defineCliConfig} from 'sanity/cli'
import {config} from 'dotenv'

// Load environment variables
config({quiet: true})

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
    dataset,
  },
  // Deploy the same dependency versions verified locally.
  deployment: {
    appId: 's8gohn15uxftcysrkubns5ky',
    autoUpdates: false,
  },
})
