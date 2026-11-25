export const KNOWN_NEWSLETTER_CTA_BACKGROUND_COLORS = [
  'bg-blue-50',
  'bg-green-50',
  'bg-purple-50',
  'bg-gray-50',
  'bg-brand-50',
] as const

export type AuditedDesignDocument = {
  _id: string
  _rev?: string
  _type: 'designTokens' | 'homePage' | 'connectPage'
  hero?: {
    overlay?: {
      opacity?: number | null
      blendMode?: string | null
    } | null
  } | null
  newsletterCta?: {
    backgroundColor?: string | null
  } | null
}

export function summarizeUnusedDesignFields(docs: AuditedDesignDocument[]) {
  const knownColors = new Set<string>(KNOWN_NEWSLETTER_CTA_BACKGROUND_COLORS)

  const designTokensDocs = docs
    .filter((doc) => doc._type === 'designTokens')
    .map((doc) => ({
      _id: doc._id,
      _rev: doc._rev ?? null,
      isDraft: doc._id.startsWith('drafts.'),
    }))
    .sort((a, b) => a._id.localeCompare(b._id))

  const heroBlendModeDocs = docs
    .filter((doc) => doc._type === 'homePage' && doc.hero?.overlay?.blendMode != null)
    .map((doc) => ({
      _id: doc._id,
      _rev: doc._rev ?? null,
      isDraft: doc._id.startsWith('drafts.'),
      blendMode: doc.hero!.overlay!.blendMode!,
      opacity: doc.hero?.overlay?.opacity ?? null,
    }))
    .sort((a, b) => a._id.localeCompare(b._id))

  const connectBackgroundColorDocs = docs
    .filter((doc) => doc._type === 'connectPage' && doc.newsletterCta?.backgroundColor != null)
    .map((doc) => {
      const backgroundColor = doc.newsletterCta!.backgroundColor!
      return {
        _id: doc._id,
        _rev: doc._rev ?? null,
        isDraft: doc._id.startsWith('drafts.'),
        backgroundColor,
        isCustomValue: !knownColors.has(backgroundColor),
      }
    })
    .sort((a, b) => a._id.localeCompare(b._id))

  return {
    designTokensDocs,
    heroBlendModeDocs,
    connectBackgroundColorDocs,
    hasCustomNewsletterBackgroundColor: connectBackgroundColorDocs.some((doc) => doc.isCustomValue),
  }
}

export type UnusedDesignFieldsCleanupPlan = {
  patches: Array<{_id: string; _rev: string; unset: string[]}>
  deletes: Array<{_id: string}>
}

export function planUnusedDesignFieldsCleanup(
  docs: AuditedDesignDocument[],
): UnusedDesignFieldsCleanupPlan {
  const summary = summarizeUnusedDesignFields(docs)
  if (summary.hasCustomNewsletterBackgroundColor) {
    throw new Error('Refusing to unset custom connectPage.newsletterCta.backgroundColor value')
  }

  const patches: UnusedDesignFieldsCleanupPlan['patches'] = []
  for (const doc of summary.heroBlendModeDocs) {
    if (!doc._rev) throw new Error(`Missing _rev on ${doc._id}`)
    patches.push({_id: doc._id, _rev: doc._rev, unset: ['hero.overlay.blendMode']})
  }
  for (const doc of summary.connectBackgroundColorDocs) {
    if (!doc._rev) throw new Error(`Missing _rev on ${doc._id}`)
    patches.push({_id: doc._id, _rev: doc._rev, unset: ['newsletterCta.backgroundColor']})
  }
  patches.sort((a, b) => a._id.localeCompare(b._id))

  const deletes = summary.designTokensDocs.map(({_id}) => ({_id}))
  return {patches, deletes}
}
