import {defineField, defineType} from 'sanity'
import {SlidersHorizontal} from 'lucide-react'

// The placeholders media-ops fills in when it renders a YouTube or Facebook title.
const placeholders = ['{title}', '{series}', '{speaker}', '{date}']

// Each placeholder in a template that media-ops doesn't fill in, named once.
function unknownPlaceholders(template: string): string[] {
  const found = template.match(/\{[^{}]*\}/g) ?? []
  return [...new Set(found)].filter((placeholder) => !placeholders.includes(placeholder))
}

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
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Media settings'}
    },
  },
})
