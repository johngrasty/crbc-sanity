// The size check for media items (contract section 10.2, spec proposal S3). The public API serves
// an item only when its ItemDetail fits in 200,000 bytes of compact UTF-8 JSON. Studio can't build
// that response, so it measures the stored item the same way and adds a fixed allowance for each
// value the website expands from another document or computes. Each allowance is the size of the
// longest value the contract's JSON Schema allows in that place, measured with the same counter, so
// the estimate never comes in under the response. The website's itemFits stays the final check.
import contract from '../../media-contract/schemas/media-v1.schema.json' with {type: 'json'}
import {ITEM_MAX_BYTES} from '../../media-contract/src/size'
import {serializedSize} from './bytes'
import {LABEL_MAX_LENGTH} from './limits'

const {$defs} = contract

// Free text of the given number of code points, at its longest. Compact JSON writes a control
// character such as U+0000 as a six-byte escape, \u0000, the most any code point takes. Labels,
// alt text, lqip and MIME types are free text, limited only by their maxLength.
const longestText = (codePoints: number) => '\u0000'.repeat(codePoints)

// Url has format uri, which the contract's tests check with ajv-formats. A URI is ASCII and holds
// no character that JSON escapes, so each of its 2,048 characters takes one byte.
const longestUrl = 'a'.repeat($defs.Url.maxLength)

// Widths, heights, positions and durations have no maximum. JSON writes no number longer than
// Number.MAX_VALUE, 1.7976931348623157e+308, at 23 bytes.
const longestNumber = Number.MAX_VALUE

// An editorial ID is its prefix and a 26-character ULID, as the ID patterns say.
const editorialId = (prefix: string) => `${prefix}${'0'.repeat(26)}`

// Instant has format date-time, which doesn't limit the fraction of a second. publishedAt comes
// from Postgres, which keeps microseconds, so this allows nine digits and an offset.
const longestInstant = '2026-10-11T13:00:00.123456789+05:00'

// ItemDetail's revision matches ^[A-Za-z0-9_-]{8,64}$.
const longestRevision = 'a'.repeat(64)

// A comma comes before every list entry after the first, so each entry counts one byte more.
const listEntry = (value: unknown) => serializedSize(value) + 1

// Every property of the public ItemDetail, from the contract's JSON Schema.
const itemDetailProperties = [
  ...Object.keys($defs.ItemSummaryFields.properties),
  ...Object.keys($defs.ItemDetail.allOf[1].properties ?? {}),
]

// What each expanded or computed value can add, in bytes.
export const sizeAllowances = {
  // A speaker reference becomes a SpeakerRef, {id, name}, with the longest name: 1,249 bytes.
  speaker: listEntry({id: editorialId('sp_'), name: longestText(LABEL_MAX_LENGTH)}),
  // A topic reference becomes a TopicRef, {id, label}: 1,250 bytes.
  topic: listEntry({id: editorialId('tp_'), label: longestText(LABEL_MAX_LENGTH)}),
  // A series reference becomes a SeriesRef, {id, title, position}: 1,285 bytes.
  series: listEntry({
    id: editorialId('se_'),
    title: longestText(LABEL_MAX_LENGTH),
    position: longestNumber,
  }),
  // A thumbnail or banner becomes an Image, {url, width, height, alt, lqip}: 15,630 bytes. The
  // property name is in the computed allowance.
  image: serializedSize({
    url: longestUrl,
    width: longestNumber,
    height: longestNumber,
    alt: longestText($defs.Image.properties.alt.maxLength),
    lqip: longestText($defs.Image.properties.lqip.maxLength),
  }),
  // A document adds a url and a mimeType to the label the item stores: 2,673 bytes.
  document: listEntry({
    url: longestUrl,
    mimeType: longestText($defs.Document.properties.mimeType.maxLength),
  }),
  // Every ItemDetail property name, in case the stored item leaves the field out, with null as
  // its value unless the website computes it. The computed values are the canonical URL, the
  // publish time, the revision, the duration, the first series' title, the availability flags and
  // the audio's duration. The rest of the audio copies the stored audioEnclosure. 3,794 bytes.
  computed: serializedSize({
    ...Object.fromEntries(itemDetailProperties.map((property) => [property, null])),
    durationSeconds: longestNumber,
    seriesTitle: longestText(LABEL_MAX_LENGTH),
    canonicalUrl: longestUrl,
    publishedAt: longestInstant,
    revision: longestRevision,
    availability: {video: false, audio: false, captions: 'available', documents: false},
    audio: {durationSeconds: longestNumber},
  }),
}

const countOf = (value: unknown) => (Array.isArray(value) ? value.length : 0)

// The estimated size of an item's public ItemDetail: the stored item as compact UTF-8 JSON, plus
// an allowance for each speaker, topic, series, image and document, and one for the computed
// fields.
export function estimatedItemBytes(item: Record<string, unknown>): number {
  const artwork = (item.artwork ?? {}) as {thumbnail?: unknown; banner?: unknown}
  const images = [artwork.thumbnail, artwork.banner].filter(Boolean).length
  return (
    serializedSize(item) +
    countOf(item.speakers) * sizeAllowances.speaker +
    countOf(item.topics) * sizeAllowances.topic +
    countOf(item.series) * sizeAllowances.series +
    images * sizeAllowances.image +
    countOf(item.documents) * sizeAllowances.document +
    sizeAllowances.computed
  )
}

const count = (value: number) => value.toLocaleString('en-US')

// The document rule: an error when the estimate passes the public API's cap.
export function itemSize(item: unknown): true | string {
  if (!item || typeof item !== 'object') return true
  const bytes = estimatedItemBytes(item as Record<string, unknown>)
  return bytes <= ITEM_MAX_BYTES
    ? true
    : `This item is too large for the website and apps. Studio estimates ${count(bytes)} bytes, and the limit is ${count(ITEM_MAX_BYTES)}. Remove some documents, speakers, topics or series, or shorten the description or passages.`
}
