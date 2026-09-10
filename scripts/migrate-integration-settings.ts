/**
 * Dry run: npx sanity exec scripts/migrate-integration-settings.ts --with-user-token
 * Apply after review: append -- --apply
 * Existing values and legacy HTML remain intact. Revision guards stop concurrent edits.
 */
import {getCliClient} from 'sanity/cli'
import {integrationPatch, type IntegrationDocument} from './integration-migration.ts'
import {runMigration} from './run-migration.ts'

await runMigration(async () => {
  const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({
    perspective: 'raw',
    useCdn: false,
  })
  const types = ['givingPage', 'watchPage', 'settings', 'lifeGroupsPage', 'communityGroupsPage']
  const docs = await client.fetch<IntegrationDocument[]>('*[_type in $types]', {types})
  const patches = docs
    .map((doc) => ({doc, set: integrationPatch(doc)}))
    .filter(({set}) => Object.keys(set).length)
  for (const type of types) {
    if (!docs.some((doc) => doc._type === type && !doc._id.startsWith('drafts.'))) {
      console.warn(`No published ${type} document. No document will be created.`)
    }
  }
  console.log(`Target: ${client.config().projectId}/${client.config().dataset}`)
  for (const {doc, set} of patches) console.log(JSON.stringify({id: doc._id, set}))
  const urls = new Set(
    patches.flatMap(({set}) =>
      Object.entries(set)
        .filter(([key]) => key.endsWith('.embedUrl'))
        .map(([, value]) => String(value)),
    ),
  )
  for (const url of urls) {
    const response = await fetch(url, {signal: AbortSignal.timeout(20000)})
    await response.body?.cancel()
    if (!response.ok || !response.url.startsWith('https://subsplash.com/'))
      throw new Error(`Embed URL check failed: HTTP ${response.status} ${url}`)
    console.log(`Embed HTTP ${response.status}: ${url}`)
  }
  if (!process.argv.includes('--apply'))
    console.log(`Dry run: ${patches.length} documents would change. Nothing written.`)
  else if (!patches.length) console.log('Nothing to migrate.')
  else {
    const tx = client.transaction()
    for (const {doc, set} of patches)
      tx.patch(doc._id, (patch) => patch.ifRevisionId(doc._rev).set(set))
    await tx.commit()
    const updated = await client.fetch<IntegrationDocument[]>('*[_id in $ids]', {
      ids: patches.map(({doc}) => doc._id),
    })
    if (
      updated.length !== patches.length ||
      updated.some((doc) => Object.keys(integrationPatch(doc)).length)
    )
      throw new Error('Post-migration verification failed')
    console.log(`Verified ${updated.length} migrated documents. Legacy fields retained.`)
  }
})
