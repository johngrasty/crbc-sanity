// The fresh-ID Duplicate for the five editorial types. The document action is a thin shell over
// this operation, and the test harness calls it too.
import type {SanityClient, SanityDocumentLike} from 'sanity'
import {editorialIdFor, newEditorialId, type EditorialType} from './editorialId'

type CopyRule = {drop: string[]; set?: Record<string, unknown>}

// Fields that must stay unique, so no copy keeps them. Old links and the importer find the
// original by them.
const droppedFromAll = ['slug', 'slugHistory', 'source']

// What else each type's copy leaves out, as dotted field paths, and what it resets.
const copyRules: Record<EditorialType, CopyRule> = {
  // The enclosure's GUID names the original's podcast episode.
  mediaItem: {drop: ['audioEnclosure']},
  // A copy is next week's service. It keeps the destinations, the duration and the zone, but
  // never records into the original's item or starts at the original's time.
  serviceEvent: {
    drop: ['mediaItem', 'scheduledStart.local', 'scheduledStart.offset', 'scheduledStart.utc'],
    set: {cancelled: false},
  },
  // Those items list the original series, so the copy's order would fail validation.
  series: {drop: ['manualOrder']},
  speaker: {drop: []},
  topic: {drop: []},
}

function unset(document: Record<string, unknown>, path: string) {
  const keys = path.split('.')
  const field = keys.pop() as string
  const parent = keys.reduce<unknown>(
    (value, key) => (value as Record<string, unknown> | undefined)?.[key],
    document,
  )
  if (parent && typeof parent === 'object') delete (parent as Record<string, unknown>)[field]
}

// Creates the copy as a new draft, even when the source is a release version, and returns it.
// The copy gets a new _id and a fresh editorial ID. Content Lake sets _rev and the timestamps.
export async function duplicateWithFreshIds(
  client: SanityClient,
  source: SanityDocumentLike,
): Promise<SanityDocumentLike> {
  const id = editorialIdFor(source._type)
  if (!id) throw new Error(`${source._type} isn't an editorial type`)
  const rule = copyRules[source._type as EditorialType]
  const copy: Record<string, unknown> = structuredClone(
    Object.fromEntries(Object.entries(source).filter(([key]) => !key.startsWith('_'))),
  )
  for (const path of [...droppedFromAll, ...rule.drop]) unset(copy, path)
  return client.create({
    ...copy,
    ...rule.set,
    _id: `drafts.${crypto.randomUUID()}`,
    _type: source._type,
    [id.field]: newEditorialId(id.kind),
  })
}
