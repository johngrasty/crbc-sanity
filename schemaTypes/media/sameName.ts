import {getPublishedId, type StringRule} from 'sanity'

const apiVersion = '2025-02-19'

// A warning when another document of this type has the same value in field, ignoring case. The
// raw perspective sees every published, draft and release version, and sanity::versionOf
// leaves out this document's own versions.
export const sameNameWarning = (
  rule: StringRule,
  {type, field, message}: {type: string; field: string; message: (value: string) => string},
) =>
  rule
    .custom(async (value, context) => {
      if (!value || !context.document) return true
      const client = context.getClient({apiVersion}).withConfig({perspective: 'raw'})
      const taken = await client.fetch(
        `count(*[_type == $type && lower(${field}) == lower($value) && !sanity::versionOf($publishedId)]) > 0`,
        {type, value, publishedId: getPublishedId(context.document._id)},
      )
      return taken ? message(value) : true
    })
    .warning()
