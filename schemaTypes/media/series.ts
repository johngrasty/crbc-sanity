import {
  defineArrayMember,
  defineField,
  defineType,
  getDraftId,
  getPublishedId,
  isReference,
  type ArrayRule,
  type ReferenceRule,
  type Rule,
  type ValidationContext,
} from 'sanity'
import {Library} from 'lucide-react'
import {artworkField} from './artwork'
import {editorialIdField} from './editorialId'
import {characterLimit, labelLimit} from './limits'
import {itemPath, referencedId, repeatsIn} from './lists'
import {slugFields} from './slug'
import {sourceField} from './source'

const orderings = [
  {title: 'Newest first', value: 'newestFirst'},
  {title: 'Oldest first', value: 'oldestFirst'},
  {title: 'Manual order', value: 'manual'},
]

const apiVersion = '2025-02-19'

// The manual order counts only while the series uses it, so its repeat and membership checks wait
// for manual order.
const usesManualOrder = ({document}: ValidationContext) =>
  (document as {ordering?: unknown} | undefined)?.ordering === 'manual'

// Where a media item in a manual order lists the series: in its published version, only in its
// draft, or in neither.
type Listing = 'published' | 'draftOnly' | 'neither'

// How each item in the order lists this series, by the item's published ID. An item with neither
// a published version nor a draft is left out, because Sanity's own reference check reports it.
async function listings(order: unknown[] | undefined, context: ValidationContext) {
  const found = new Map<string, Listing>()
  const ids = [...new Set((order ?? []).map(referencedId))].filter(
    (id): id is string => typeof id === 'string',
  )
  if (!ids.length || !context.document) return found
  // The raw perspective sees each item's published version and its draft side by side.
  const versions: {_id: string; series: unknown}[] = await context
    .getClient({apiVersion})
    .withConfig({perspective: 'raw'})
    .fetch(`*[_id in $ids]{_id, "series": series[]._ref}`, {
      ids: ids.flatMap((id) => [id, getDraftId(id)]),
    })
  const series = getPublishedId(context.document._id)
  // Whether a version lists the series, or undefined when there's no such version.
  const lists = (id: string) => {
    const version = versions.find(({_id}) => _id === id)
    return version && Array.isArray(version.series) && version.series.includes(series)
  }
  for (const id of ids) {
    const [published, draft] = [lists(id), lists(getDraftId(id))]
    if (published === undefined && draft === undefined) continue
    found.set(id, published ? 'published' : draft ? 'draftOnly' : 'neither')
  }
  return found
}

// A rule that marks each item in the order with this listing.
const listingRule = (rule: ArrayRule<unknown[]>, listing: Listing, message: string) =>
  rule.custom(async (order, context) => {
    if (!usesManualOrder(context)) return true
    const found = await listings(order, context)
    const marked = (order ?? []).flatMap((item, index) =>
      found.get(referencedId(item) as string) === listing
        ? [{message, path: itemPath(item, index)}]
        : [],
    )
    return marked.length ? marked : true
  })

// A copy of a reference's rule without Sanity's reference check, which marks an entry whose
// document isn't published (lib/index.js:6290-6314). reset() keeps the check that the value is an
// object.
const withoutReferenceCheck = (rule: ReferenceRule) =>
  (rule as unknown as Rule).clone().reset() as unknown as ReferenceRule

// An entry that may stop the series from publishing: one that isn't a reference, or one Studio
// stored while its item wasn't published, which carries _weak or _strengthenOnPublish. Content
// Lake refuses to store a strong reference to a document that doesn't exist, in a draft too, so
// every other entry points at a published item. An entry whose item has published since keeps
// those marks until the series publishes, so it counts here without an error.
const mayBlockPublish = (entry: unknown) =>
  !isReference(entry) || entry._weak === true || entry._strengthenOnPublish !== undefined

// An entry in the manual order. Publishing strengthens every entry, and Content Lake won't publish
// a strong reference to an item that isn't published, in any ordering. So this rule makes Sanity's
// own reference checks always. With another order the field is otherwise hidden, so its message
// says the saved order is the problem.
const orderEntry = defineArrayMember({
  type: 'reference',
  to: [{type: 'mediaItem'}],
  validation: (rule) =>
    withoutReferenceCheck(rule).custom(async (entry, context) => {
      if (!entry) return true
      if (!isReference(entry)) return 'Must be a reference to a document'
      if (!context.getDocumentExists) {
        throw new Error('getDocumentExists was not provided in the validation context')
      }
      if (await context.getDocumentExists({id: entry._ref})) return true
      return usesManualOrder(context)
        ? 'Referenced document must be published'
        : "This saved manual order lists an item that isn't published. Publish it or remove it from the order."
    }),
})

export default defineType({
  name: 'series',
  title: 'Series',
  type: 'document',
  icon: Library,
  fields: [
    editorialIdField('series'),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The name of the series viewers see, such as The Gospel of John.',
      validation: (rule) => [
        rule.required().error('Add a title for the series.'),
        labelLimit(rule),
      ],
    }),
    ...slugFields('series'),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      description:
        'What viewers read about the series on the website and in the apps. Plain text, up to 5,000 characters.',
      validation: (rule) => characterLimit(rule, 5000),
    }),
    artworkField('series'),
    defineField({
      name: 'ordering',
      title: 'Order',
      type: 'string',
      description:
        'How the website and apps list the recordings in this series. Manual order lets you drag them into place.',
      options: {list: orderings, layout: 'radio'},
      initialValue: 'newestFirst',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'manualOrder',
      title: 'Manual order',
      type: 'array',
      description:
        'Drag the media items into the order viewers see them in. Each item must also list this series in its own Series field. The website uses this order only when Order is Manual order.',
      of: [orderEntry],
      // With another order, the saved order shows only when an entry would stop the series from
      // publishing, so the editor can see the error and fix it.
      hidden: ({document}) =>
        document?.ordering !== 'manual' &&
        !(Array.isArray(document?.manualOrder) && document.manualOrder.some(mayBlockPublish)),
      validation: (rule) => [
        rule.custom((order, context) =>
          usesManualOrder(context)
            ? repeatsIn(order, referencedId, 'This media item is already in the order.')
            : true,
        ),
        listingRule(
          rule,
          'neither',
          "This media item doesn't list this series. Add the series to the item, or take the item out of the order.",
        ),
        listingRule(
          rule,
          'draftOnly',
          "Only this media item's unpublished draft lists this series. Publish the item to add it to the series.",
        ).warning(),
      ],
    }),
    sourceField('series'),
  ],
  preview: {
    select: {title: 'title', thumbnail: 'artwork.thumbnail'},
    prepare: ({title, thumbnail}) => ({title: title || 'Untitled series', media: thumbnail}),
  },
})
