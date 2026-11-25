/**
 * Read-only audit: npx sanity exec scripts/audit-unused-design-fields.ts --with-user-token
 * Reports published and draft occurrences of deprecated designTokens, hero.overlay.blendMode,
 * and connectPage.newsletterCta.backgroundColor without mutating any documents.
 */
import {getCliClient} from 'sanity/cli'
import {runMigration} from './run-migration.ts'
import {
  summarizeUnusedDesignFields,
  type AuditedDesignDocument,
} from './unused-design-fields-audit.ts'

await runMigration(async () => {
  const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({
    perspective: 'raw',
    useCdn: false,
  })
  const docs = await client.fetch<AuditedDesignDocument[]>(
    '*[_type in ["designTokens", "homePage", "connectPage"]]{_id, _rev, _type, hero{overlay{opacity, blendMode}}, newsletterCta{backgroundColor}}',
  )
  const report = summarizeUnusedDesignFields(docs)
  console.log(`Target: ${client.config().projectId}/${client.config().dataset}`)
  console.log(JSON.stringify(report, null, 2))
  console.log('Read-only audit complete. Nothing written.')
})
