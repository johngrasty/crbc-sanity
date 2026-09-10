/** Dry run by default. After review, append -- --apply to sanity exec. */
import {getCliClient} from 'sanity/cli'
import {jobOrderPatches, type JobOrderDocument} from './job-order-migration.ts'
import {runMigration} from './run-migration.ts'

await runMigration(async () => {
  const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({
    perspective: 'raw',
    useCdn: false,
  })
  const docs = await client.fetch<JobOrderDocument[]>(
    '*[_type == "jobOpening"]{_id,_rev,title,displayOrder,orderRank}',
  )
  const patches = jobOrderPatches(docs)
  console.log(`Target: ${client.config().projectId}/${client.config().dataset}`)
  for (const {doc, orderRank} of patches) console.log(JSON.stringify({id: doc._id, orderRank}))
  if (!process.argv.includes('--apply'))
    console.log(`Dry run: ${patches.length} job versions would change. Nothing written.`)
  else if (!patches.length) console.log('Nothing to migrate.')
  else {
    const tx = client.transaction()
    for (const {doc, orderRank} of patches)
      tx.patch(doc._id, (patch) => patch.ifRevisionId(doc._rev).set({orderRank}))
    await tx.commit()
    const updated = await client.fetch<JobOrderDocument[]>(
      '*[_type == "jobOpening"]{_id,_rev,title,displayOrder,orderRank}',
    )
    if (jobOrderPatches(updated).length) throw new Error('Post-migration rank verification failed')
    console.log(
      `Verified ${patches.length} ranked job versions. Legacy displayOrder values retained.`,
    )
  }
})
