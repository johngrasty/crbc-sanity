// Where the migration importer found a document in the old Subsplash or Vimeo library (contract
// sections 2 and 3, errata E57 and E85). Only the importer writes it, so Studio shows it
// read-only, and only when it's set. Media items, series, speakers and topics share this field:
// {...sourceField('series'), group: 'source'}.
import {defineArrayMember, defineField, type ValidationError} from 'sanity'
import {editorialIds, type EditorialType} from './editorialId'
import {itemPath} from './lists'
import {otherHolder} from './uniqueValue'
import {urlRule} from './url'

type SourceType = Exclude<EditorialType, 'serviceEvent'>

// Items and series can come from Vimeo as well as Subsplash (E85). Speakers and topics come only
// from Subsplash.
const library = (type: SourceType) =>
  type === 'mediaItem' || type === 'series' ? 'Subsplash or Vimeo library' : 'Subsplash library'

// What source.aliases holds for each type. It isn't the aliases field of a speaker or topic,
// which lists other names (aliases.ts).
const aliasesDescriptions: Record<SourceType, string> = {
  mediaItem:
    'Source IDs of other copies the importer joined into this media item, such as the same video in another Subsplash series or on Vimeo. Once the item is public, an old Subsplash link to any of them leads to it. These are IDs, not other names.',
  series:
    'Source IDs of the same series in the old libraries, such as the Vimeo showcase the importer matched to it. These are IDs, not other names for the series.',
  speaker:
    'Source IDs of the same speaker in the old library. These are IDs, not other names. Other names the speaker goes by are under Aliases.',
  topic:
    'Source IDs of the same topic in the old library. These are IDs, not other words for the topic. Those are under Aliases.',
}

export function sourceField(type: SourceType) {
  const {noun, label} = editorialIds[type]
  // A source ID has one holder among documents of a type, as a source ID or an alias (E85).
  // Documents of other types can share it.
  const taken = (holder: string) =>
    `The ${noun} ${holder} already uses this source ID. Ask a developer to fix it.`
  return defineField({
    name: 'source',
    title: 'Import source',
    type: 'object',
    description: `Where the importer found this ${noun} in the old ${library(type)}. Only the importer sets it.`,
    readOnly: true,
    hidden: ({value}) => !value,
    fields: [
      defineField({
        name: 'sourceId',
        title: 'Source ID',
        type: 'string',
        description: `The ID of this ${noun} in the old library. Its ${label} comes from this ID, never from an alias.`,
        // The importer derives the editorial ID from this, so no other document of the type may
        // hold it.
        validation: (rule) =>
          rule.custom(async (value, context) => {
            if (!value) return true
            const holder = await otherHolder(context, {type, value, kind: 'sourceId'})
            return holder ? taken(holder) : true
          }),
      }),
      defineField({
        name: 'aliases',
        title: 'Other source IDs',
        type: 'array',
        description: aliasesDescriptions[type],
        of: [defineArrayMember({type: 'string'})],
        // Absent and empty both mean none.
        hidden: ({value}) => !Array.isArray(value) || value.length === 0,
        validation: (rule) =>
          rule.custom(async (value, context) => {
            const aliases = (value ?? []) as unknown[]
            const sourceId = (context.parent as {sourceId?: unknown} | undefined)?.sourceId
            const messages = await Promise.all(
              aliases.map(async (alias, index) => {
                if (typeof alias !== 'string' || !alias) return undefined
                if (alias === sourceId)
                  return `This is already the source ID of this ${noun}, so it can't also be an alias. Ask a developer to fix it.`
                if (aliases.indexOf(alias) < index)
                  return 'This source ID is already in the list. Ask a developer to fix it.'
                const holder = await otherHolder(context, {type, value: alias, kind: 'sourceId'})
                return holder ? taken(holder) : undefined
              }),
            )
            const errors: ValidationError[] = messages.flatMap((message, index) =>
              message ? [{message, path: itemPath(aliases[index], index)}] : [],
            )
            return errors.length ? errors : true
          }),
      }),
      defineField({
        name: 'sourceUrl',
        title: 'Source page',
        type: 'url',
        description:
          "The old library's page for the source ID, not for an alias. It may no longer open.",
        validation: (rule) => urlRule(rule),
      }),
      defineField({name: 'originalPublishedAt', title: 'First published', type: 'datetime'}),
    ],
  })
}
