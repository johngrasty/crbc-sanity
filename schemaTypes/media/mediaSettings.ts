import {defineField, defineType} from 'sanity'
import {SlidersHorizontal} from 'lucide-react'
import {utf8Bytes} from './bytes'

// The placeholders media-ops fills in when it renders a YouTube or Facebook title.
const placeholders = ['{title}', '{series}', '{speaker}', '{date}']

// Each placeholder in a template that media-ops doesn't fill in, named once.
function unknownPlaceholders(template: string): string[] {
  const found = template.match(/\{[^{}]*\}/g) ?? []
  return [...new Set(found)].filter((placeholder) => !placeholders.includes(placeholder))
}

// Contract section 9.6 says Studio limits the footer to 1,000 UTF-8 bytes. media-ops fits the
// item's link, the footer and the body into a 5,000-byte description, in that order of priority.
const FOOTER_MAX_BYTES = 1000

const listOf = (items: string[], conjunction: 'and' | 'or') =>
  items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} ${conjunction} ${items.at(-1)}`

export default defineType({
  name: 'mediaSettings',
  title: 'Media settings',
  type: 'document',
  icon: SlidersHorizontal,
  fields: [
    defineField({
      name: 'socialTitleTemplate',
      title: 'YouTube and Facebook title',
      type: 'string',
      validation: (rule) => [
        rule.required(),
        rule.max(200),
        rule.custom((value) => {
          const unknown = value ? unknownPlaceholders(value) : []
          if (!unknown.length) return true
          const what = unknown.length === 1 ? "isn't a placeholder" : "aren't placeholders"
          return `${listOf(unknown, 'and')} ${what}. Use ${listOf(placeholders, 'or')}.`
        }),
      ],
    }),
    defineField({
      name: 'socialDescriptionFooter',
      title: 'Description footer',
      type: 'text',
      rows: 4,
      validation: (rule) =>
        rule.custom((value) => {
          const bytes = value ? utf8Bytes(value) : 0
          if (bytes <= FOOTER_MAX_BYTES) return true
          return `The footer is ${bytes.toLocaleString('en-US')} bytes. Shorten it to ${FOOTER_MAX_BYTES.toLocaleString('en-US')} bytes or less. Accented letters and emoji take 2 to 4 bytes each.`
        }),
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Media settings'}
    },
  },
})
