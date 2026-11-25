/**
 * Dry run: npx sanity exec scripts/cleanup-unused-design-fields.ts --with-user-token
 * Apply after review: append -- --apply
 * Unsets deprecated hero.overlay.blendMode and connectPage.newsletterCta.backgroundColor
 * with revision guards, and deletes deprecated designTokens documents after checking references.
 */
import {getCliClient} from 'sanity/cli'
import {runMigration} from './run-migration.ts'
import {
  planUnusedDesignFieldsCleanup,
  summarizeUnusedDesignFields,
  type AuditedDesignDocument,
} from './unused-design-fields-audit.ts'

const AUDIT_QUERY =
  '*[_type in ["designTokens", "homePage", "connectPage"]]{_id, _rev, _type, hero{overlay{opacity, blendMode}}, newsletterCta{backgroundColor}}'

await runMigration(async () => {
  const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({
    perspective: 'raw',
    useCdn: false,
  })
  const before = await client.fetch<AuditedDesignDocument[]>(AUDIT_QUERY)
  const plan = planUnusedDesignFieldsCleanup(before)

  const deleteIds = plan.deletes.map((doc) => doc._id)
  const incomingRefs = deleteIds.length
    ? await client.fetch<Array<{_id: string; _type: string}>>('*[references($ids)]{_id, _type}', {
        ids: deleteIds,
      })
    : []

  console.log(`Target: ${client.config().projectId}/${client.config().dataset}`)
  console.log(JSON.stringify({plan, incomingReferences: incomingRefs}, null, 2))

  if (incomingRefs.length > 0) {
    throw new Error('Cannot delete designTokens while incoming references exist')
  }

  if (!process.argv.includes('--apply')) {
    console.log(
      `Dry run: ${plan.patches.length} patch(es) and ${plan.deletes.length} delete(s) planned. Nothing written.`,
    )
    return
  }

  if (plan.patches.length === 0 && plan.deletes.length === 0) {
    console.log('Nothing to clean up.')
    return
  }

  const expectedOpacities = new Map(
    before
      .filter((doc) => doc._type === 'homePage')
      .map((doc) => [doc._id, doc.hero?.overlay?.opacity ?? null]),
  )

  const tx = client.transaction()
  for (const patch of plan.patches) {
    tx.patch(patch._id, (p) => p.ifRevisionId(patch._rev).unset(patch.unset))
  }
  for (const doc of plan.deletes) {
    tx.delete(doc._id)
  }
  await tx.commit()

  const after = await client.fetch<AuditedDesignDocument[]>(AUDIT_QUERY)
  const remaining = summarizeUnusedDesignFields(after)
  if (
    remaining.designTokensDocs.length > 0 ||
    remaining.heroBlendModeDocs.length > 0 ||
    remaining.connectBackgroundColorDocs.length > 0
  ) {
    throw new Error('Post-cleanup verification failed: deprecated fields or documents remain')
  }

  for (const [id, expectedOpacity] of expectedOpacities) {
    const updated = after.find((doc) => doc._id === id)
    const actualOpacity = updated?.hero?.overlay?.opacity ?? null
    if (actualOpacity !== expectedOpacity) {
      throw new Error(`Post-cleanup verification failed: ${id} hero.overlay.opacity changed`)
    }
  }

  console.log(
    `Verified cleanup: ${plan.patches.length} document(s) patched, ${plan.deletes.length} document(s) deleted, hero.overlay.opacity preserved.`,
  )
})
