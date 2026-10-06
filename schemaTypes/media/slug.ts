// Slugs and slug history, shared by media items and series. Old links keep working: when a
// published slug changes, the version being edited keeps the old slug in slugHistory, so it
// survives the Publish button, a release or any other way of publishing.
import {
  defineArrayMember,
  defineField,
  getPublishedId,
  type Rule,
  type SanityDocumentLike,
  type SlugIsUniqueValidator,
  type SlugRule,
} from 'sanity'
import speakingurl from 'speakingurl'
import contract from '../../media-contract/schemas/media-v1.schema.json' with {type: 'json'}
import type {FormFollowUp} from '../../structure/documentConfig'
import {checkCharacters, SLUG_MAX_LENGTH} from './limits'

// One entry per document type with a slug. Each type is its own namespace. A media item can
// publish without a slug, so a placeholder can go out before it has a title. A series can't.
export const slugTypes = {
  mediaItem: {noun: 'media item', required: false},
  series: {noun: 'series', required: true},
} as const

export type SlugType = keyof typeof slugTypes

type SlugEntry = {_type: 'slug'; _key: string; current: string}

const apiVersion = '2025-02-19'

// The slug text of a slug object, or nothing when it's missing or blank.
function slugText(value: unknown): string | undefined {
  const current = (value as {current?: unknown} | undefined)?.current
  return typeof current === 'string' && current.trim() ? current : undefined
}

const currentSlug = (document: SanityDocumentLike | null) => slugText(document?.slug)

const historyEntries = (document: SanityDocumentLike | null): unknown[] =>
  Array.isArray(document?.slugHistory) ? document.slugHistory : []

const historySlugs = (document: SanityDocumentLike | null) =>
  historyEntries(document).flatMap((entry) => slugText(entry) ?? [])

// The history a version should have: its own history, then the published history, then the
// published slug when the version's slug differs. No repeats, and never the current slug.
function expectedHistory(version: SanityDocumentLike, published: SanityDocumentLike | null) {
  const current = currentSlug(version)
  const slugs = [...historySlugs(version), ...historySlugs(published), currentSlug(published)]
  return [...new Set(slugs)].filter((slug): slug is string => Boolean(slug) && slug !== current)
}

// The published slugs a version's history must keep: the published history and the published
// slug, except the version's current slug.
function owedHistory(version: SanityDocumentLike, published: SanityDocumentLike | null) {
  return expectedHistory({...version, slugHistory: []}, published)
}

const quoted = (slugs: string[]) => slugs.map((slug) => `"${slug}"`).join(', ')

// Sanity's own slug check refuses a slug that another document of the type has as its current
// slug, leaving out this document's own versions. This extends it to their old slugs too, so
// editors see Sanity's one message for both. History entries use it as well.
const isUnique: SlugIsUniqueValidator = async (slug, context) => {
  // Sanity's check reads the slug at the path it validates, which for a history entry is inside
  // an array. Point it at the current slug.
  if (!(await context.defaultIsUnique(slug, {...context, path: ['slug']}))) return false
  const {document, getClient} = context
  if (!document) return true
  return getClient({apiVersion})
    .withConfig({perspective: 'raw'})
    .fetch(
      `!defined(*[_type == $type && !sanity::versionOf($published) && $slug in slugHistory[].current][0]._id)`,
      {type: document._type, published: getPublishedId(document._id), slug},
    )
}

// The contract's slug: lower-case letters and digits, in words joined by single hyphens.
const SLUG_PATTERN = new RegExp(contract.$defs.Slug.pattern)

// What Generate makes from the title: Sanity's own slugify, speakingurl, which writes Rock & Roll
// as rock-and-roll, then a hyphen for anything the contract's pattern doesn't allow, such as an
// underscore.
const slugify = (title: string) =>
  speakingurl(title, {truncate: SLUG_MAX_LENGTH, symbols: true})
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// The shape rules for a slug and for each history entry, as one rule. Sanity adds its own slug
// check to every rule it hands a slug field, so a second rule would report a taken slug twice.
// Sanity's check already reports a slug with blank text.
const slugShape = (rule: SlugRule) =>
  rule
    .custom((value) => {
      const current = slugText(value)
      return !current || SLUG_PATTERN.test(current)
        ? true
        : 'Use lower-case letters and numbers, with single hyphens between words, like easter-sunday.'
    })
    .custom((value) => checkCharacters(slugText(value), SLUG_MAX_LENGTH))

// A copy of the rule without Sanity's slug check, for a second rule on the slug field, so a
// taken slug still gets one message.
const withoutSlugCheck = (rule: SlugRule) =>
  (rule as unknown as Rule).clone().reset() as unknown as SlugRule

// A missing slug, at the type's level. It's a custom rule, because required() on a slug also
// runs the rule on its current text and gives a second marker.
function missingSlug(rule: SlugRule, type: SlugType) {
  const {noun, required} = slugTypes[type]
  const missing = rule.custom((value) =>
    slugText(value) ? true : `Add a slug. Generate makes one from the ${noun}'s title.`,
  )
  return required ? missing : missing.warning()
}

const isEntry = (entry: unknown): entry is SlugEntry => {
  const {_type, _key, current} = (entry ?? {}) as Partial<SlugEntry>
  return _type === 'slug' && typeof _key === 'string' && typeof current === 'string'
}

// A key made from the slug, an FNV-1a hash, so every open form gives a new entry the same key.
// A key the history already uses moves on to the next attempt.
function keyFor(slug: string, used: Set<string>): string {
  for (let attempt = 0; ; attempt++) {
    let hash = 0x811c9dc5
    for (const char of attempt ? `${slug}#${attempt}` : slug) {
      hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 0x01000193)
    }
    const key = (hash >>> 0).toString(36)
    if (!used.has(key)) return key
  }
}

// The follow-up step that gives a draft or release version its expected history, or null when
// it already has it.
export const slugHistoryPatch: FormFollowUp = ({version, published}) => {
  const expected = expectedHistory(version, published)
  const entries = historyEntries(version)
  const keys = new Set(entries.filter(isEntry).map(({_key}) => _key))
  const matches =
    entries.length === expected.length &&
    keys.size === entries.length &&
    entries.every((entry, index) => isEntry(entry) && entry.current === expected[index])
  if (matches) return null
  if (!expected.length) return {unset: ['slugHistory']}
  // Each slug keeps its key from the version, or else from the published history.
  const known = new Map(
    [...historyEntries(published), ...entries]
      .filter(isEntry)
      .map(({current, _key}) => [current, _key]),
  )
  const used = new Set<string>()
  const slugHistory = expected.map((current): SlugEntry => {
    const knownKey = known.get(current)
    const _key = knownKey && !used.has(knownKey) ? knownKey : keyFor(current, used)
    used.add(_key)
    return {_type: 'slug', _key, current}
  })
  return {set: {slugHistory}}
}

// The slug and slug history fields for one of the types in slugTypes, in that order.
export function slugFields(type: SlugType) {
  const {noun} = slugTypes[type]
  return [
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: `The end of the link to this ${noun}. Generate makes it from the title. If you change it after publishing, links with the old slug keep working.`,
      options: {source: 'title', slugify, isUnique},
      validation: (rule) => [slugShape(rule), missingSlug(withoutSlugCheck(rule), type)],
    }),
    defineField({
      name: 'slugHistory',
      title: 'Old slugs',
      type: 'array',
      description: `Links with these slugs still lead to this ${noun}. Studio adds a slug here when you publish a new one.`,
      of: [
        defineArrayMember({
          type: 'slug',
          options: {isUnique},
          validation: (rule) => slugShape(rule),
        }),
      ],
      readOnly: true,
      // The form keeps the history right. These rules catch a version written some other way,
      // such as through the API, before it can publish.
      validation: (rule) => [
        rule.custom((_value, {document}) => {
          const current = document && currentSlug(document)
          return current && historySlugs(document).includes(current)
            ? `Old slugs can't include the current slug, ${quoted([current])}. Open this version of the ${noun} in Studio to fix it.`
            : true
        }),
        rule.custom(async (_value, context) => {
          const {document} = context
          if (!document) return true
          const published = await context
            .getClient({apiVersion})
            .withConfig({perspective: 'raw'})
            .fetch(`*[_id == $id][0]{_id, _type, slug, slugHistory}`, {
              id: getPublishedId(document._id),
            })
          const history = historySlugs(document)
          const missing = owedHistory(document, published).filter((slug) => !history.includes(slug))
          if (!missing.length) return true
          return `Old slugs are missing ${quoted(missing)}, which links still use. Open this version of the ${noun} in Studio to add ${missing.length === 1 ? 'it' : 'them'} back.`
        }),
      ],
    }),
  ]
}
