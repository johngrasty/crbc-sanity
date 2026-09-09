/**
 * One-off migration: give every staff document an orderRank so the
 * @sanity/orderable-document-list drag lists start in the order the site
 * showed before (category, then the old numeric `order`, then name).
 *
 * Run: npx sanity exec scripts/migrate-staff-order-rank.ts --with-user-token
 * Safe to re-run: documents that already have an orderRank are skipped.
 */
import {getCliClient} from 'sanity/cli'
import {LexoRank} from 'lexorank'

const client = getCliClient({apiVersion: '2025-02-19'})

type Staff = {_id: string; name: string; category: string; order?: number; orderRank?: string}

const staff = await client.fetch<Staff[]>(
  `*[_type == "staff" && !(_id in path("drafts.**"))] | order(category asc, order asc, name asc){_id, name, category, order, orderRank}`,
)
const drafts = new Set(
  await client.fetch<string[]>(`*[_type == "staff" && _id in path("drafts.**")]._id`),
)

let rank = LexoRank.middle()
const tx = client.transaction()
let patched = 0
for (const doc of staff) {
  rank = rank.genNext()
  if (doc.orderRank) {
    console.log(`skip  ${doc.name} (already ranked ${doc.orderRank})`)
    continue
  }
  const value = rank.toString()
  tx.patch(doc._id, (p) => p.set({orderRank: value}))
  if (drafts.has(`drafts.${doc._id}`)) tx.patch(`drafts.${doc._id}`, (p) => p.set({orderRank: value}))
  console.log(`rank  ${value}  ${doc.category.padEnd(9)} ${doc.name}`)
  patched++
}
if (patched === 0) {
  console.log('Nothing to do.')
} else {
  await tx.commit()
  console.log(`Patched ${patched} staff documents.`)
}
