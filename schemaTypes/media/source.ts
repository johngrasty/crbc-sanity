// Where the migration importer found a document in Subsplash (contract sections 2 and 3). Only
// the importer writes it, so Studio shows it read-only, and only when it's set. Media items,
// series, speakers and topics share this field: {...sourceField('series'), group: 'source'}.
import {defineField, getPublishedId} from 'sanity'
import {editorialIds, type EditorialType} from './editorialId'
import {urlRule} from './url'

const apiVersion = '2025-02-19'

export function sourceField(type: Exclude<EditorialType, 'serviceEvent'>) {
  const {noun} = editorialIds[type]
  return defineField({
    name: 'source',
    title: 'Import source',
    type: 'object',
    description: `Where the importer found this ${noun} in Subsplash. Only the importer sets it.`,
    readOnly: true,
    hidden: ({value}) => !value,
    fields: [
      defineField({
        name: 'sourceId',
        title: 'Source ID',
        type: 'string',
        // The importer derives the editorial ID from this, so two documents of a type can't
        // share it. Documents of other types can.
        validation: (rule) =>
          rule.custom(async (value, context) => {
            if (!value || !context.document) return true
            // The raw perspective sees every published, draft and release version.
            // sanity::versionOf leaves out this document's own versions.
            const client = context.getClient({apiVersion}).withConfig({perspective: 'raw'})
            const taken = await client.fetch(
              `count(*[_type == $type && source.sourceId == $value && !sanity::versionOf($publishedId)]) > 0`,
              {type, value, publishedId: getPublishedId(context.document._id)},
            )
            return taken ? `Another ${noun} has this source ID. Ask a developer to fix it.` : true
          }),
      }),
      defineField({
        name: 'sourceUrl',
        title: 'Source page',
        type: 'url',
        validation: (rule) => urlRule(rule),
      }),
      defineField({name: 'originalPublishedAt', title: 'First published', type: 'datetime'}),
    ],
  })
}
