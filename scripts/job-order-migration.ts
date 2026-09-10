import {LexoRank} from 'lexorank'

export type JobOrderDocument = {
  _id: string
  _rev: string
  displayOrder?: number
  title?: string
  orderRank?: string
}

export function jobOrderPatches(docs: JobOrderDocument[]) {
  const groups = new Map<string, JobOrderDocument[]>()
  for (const doc of docs) {
    const id = doc._id.replace(/^drafts\./, '')
    groups.set(id, [...(groups.get(id) || []), doc])
  }
  const rows = [...groups.values()]
    .map((versions) => ({
      versions,
      primary: versions.find((doc) => !doc._id.startsWith('drafts.')) || versions[0],
    }))
    .sort(
      (a, b) =>
        (a.primary.displayOrder ?? 100) - (b.primary.displayOrder ?? 100) ||
        (a.primary.title || '').localeCompare(b.primary.title || '') ||
        a.primary._id.localeCompare(b.primary._id),
    )
  if (rows.some(({primary}) => primary.orderRank) && rows.some(({primary}) => !primary.orderRank)) {
    throw new Error('Job ranks are partially populated. Review the mixed order before migrating.')
  }
  let rank = LexoRank.middle()
  return rows.flatMap(({versions, primary}) => {
    rank = rank.genNext()
    const orderRank = primary.orderRank || rank.toString()
    return versions.filter((doc) => !doc.orderRank).map((doc) => ({doc, orderRank}))
  })
}
