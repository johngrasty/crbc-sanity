// The five editorial ID fields (contract section 2). Each is the contract prefix plus a ULID,
// set once when the document is created and never changed in Studio.
import {Button, Card, Code, Stack, Text} from '@sanity/ui'
import {defineField, getPublishedId, set, type StringInputProps} from 'sanity'
import {ID_PREFIXES, isId, type IdKind} from '../../media-contract/src/ids'

type EditorialIdKind = Extract<IdKind, 'content' | 'series' | 'speaker' | 'topic' | 'event'>

type EditorialId = {field: string; kind: EditorialIdKind; label: string; noun: string}

// One entry per document type. Templates and validation read this table.
export const editorialIds = {
  mediaItem: {field: 'contentId', kind: 'content', label: 'content ID', noun: 'media item'},
  series: {field: 'seriesId', kind: 'series', label: 'series ID', noun: 'series'},
  speaker: {field: 'speakerId', kind: 'speaker', label: 'speaker ID', noun: 'speaker'},
  topic: {field: 'topicId', kind: 'topic', label: 'topic ID', noun: 'topic'},
  serviceEvent: {field: 'eventId', kind: 'event', label: 'event ID', noun: 'service event'},
} as const satisfies Record<string, EditorialId>

export type EditorialType = keyof typeof editorialIds

export const editorialIdFor = (type: string): EditorialId | undefined =>
  Object.hasOwn(editorialIds, type) ? editorialIds[type as EditorialType] : undefined

const apiVersion = '2025-02-19'

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

// A ULID: 48 bits of millisecond time, then 80 random bits, in Crockford base32.
function ulid(): string {
  let time = ''
  for (let rest = Date.now(), i = 0; i < 10; i++, rest = Math.floor(rest / 32)) {
    time = CROCKFORD[rest % 32] + time
  }
  let random = ''
  let bits = 0
  let buffer = 0
  for (const byte of crypto.getRandomValues(new Uint8Array(10))) {
    buffer = (buffer << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      random += CROCKFORD[(buffer >> bits) & 31]
    }
    buffer &= (1 << bits) - 1
  }
  return time + random
}

export const newEditorialId = (kind: EditorialIdKind): string => ID_PREFIXES[kind] + ulid()

function idInput({kind, label, noun}: EditorialId) {
  function EditorialIdInput({value, onChange, readOnly}: StringInputProps) {
    if (value) {
      return (
        <Card padding={3} radius={2} border tone="transparent">
          <Code size={1}>{value}</Code>
        </Card>
      )
    }
    return (
      <Stack space={3}>
        <Text size={1} muted>
          This {noun} has no {label} yet.
        </Text>
        <Button
          mode="ghost"
          text="Assign an ID"
          disabled={readOnly}
          onClick={() => onChange(set(newEditorialId(kind)))}
        />
      </Stack>
    )
  }
  return EditorialIdInput
}

// The ID field for one of the five editorial types.
export function editorialIdField(type: EditorialType) {
  const id = editorialIds[type]
  return defineField({
    name: id.field,
    title: id.label[0].toUpperCase() + id.label.slice(1),
    type: 'string',
    description: `Apps, links and bookmarks use this ID to find the ${id.noun}. Studio assigns it when you create the ${id.noun}, and it never changes.`,
    readOnly: ({value}) => Boolean(value),
    // AI Assist offers a field unless its readOnly is literally true, so an empty ID could be
    // filled with text that fails the format rule and then can't be cleared.
    options: {aiAssist: {exclude: true}},
    components: {input: idInput(id)},
    validation: (rule) => [
      rule.required().error(`Assign an ID. Apps and links can't find this ${id.noun} without one.`),
      rule.custom(async (value, context) => {
        if (!value) return true
        if (!isId(id.kind, value)) {
          return `This ${id.label} isn't in the right format, ${ID_PREFIXES[id.kind]} and 26 letters or digits. Ask a developer to fix it.`
        }
        if (!context.document) return true
        // The raw perspective sees every published, draft and release version.
        // sanity::versionOf leaves out this document's own versions.
        const client = context.getClient({apiVersion}).withConfig({perspective: 'raw'})
        const {published, taken} = await client.fetch(
          `{
            "published": *[_id == $publishedId][0].${id.field},
            "taken": count(*[_type == $type && ${id.field} == $value && !sanity::versionOf($publishedId)]) > 0
          }`,
          {type, value, publishedId: getPublishedId(context.document._id)},
        )
        // Catches an ID changed by paste or through the API before it can publish.
        if (published && published !== value) {
          return `The published ${id.noun} has the ${id.label} ${published}. IDs never change, so discard this change.`
        }
        if (taken) {
          return `Another ${id.noun} already uses this ${id.label}. Ask a developer to fix it.`
        }
        return true
      }),
    ],
  })
}
