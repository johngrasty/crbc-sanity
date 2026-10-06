import {defineField, defineType} from 'sanity'
import {Mic} from 'lucide-react'
import {editorialIdField} from './editorialId'
import {aliasesField} from './aliases'
import {labelLimit} from './limits'
import {sameNameWarning} from './sameName'
import {sourceField} from './source'

// The first letter of the name's first and last words, such as SJ for Sam Jones.
function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((word) => word.match(/\p{L}/u)?.[0])
    .filter((letter) => letter !== undefined)
  return (
    letters.length > 1 ? letters[0] + letters[letters.length - 1] : letters.join('')
  ).toUpperCase()
}

// Stands in for the photo in lists and reference fields, as apps do (contract section 3).
function Initials({text}: {text: string}) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        fontSize: '0.8125rem',
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  )
}

export default defineType({
  name: 'speaker',
  title: 'Speaker',
  type: 'document',
  icon: Mic,
  fields: [
    editorialIdField('speaker'),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'The name viewers see on recordings, such as Sam Jones.',
      validation: (rule) => [
        rule.required().error("Add the speaker's name."),
        labelLimit(rule),
        sameNameWarning(rule, {
          type: 'speaker',
          field: 'name',
          message: (name) =>
            `Another speaker is already named ${name}. Check that it isn't the same person.`,
        }),
      ],
    }),
    aliasesField(
      'Other names people know the speaker by, such as Pastor Sam. Search finds the speaker under any of them. Up to 20.',
    ),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      description:
        "A head-and-shoulders photo. Apps show the speaker's initials when there's none.",
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: "Describe the photo for people who can't see it, such as Sam Jones smiling.",
          validation: (rule) => labelLimit(rule),
        }),
      ],
    }),
    sourceField('speaker'),
  ],
  preview: {
    select: {name: 'name', aliases: 'aliases', photo: 'photo'},
    prepare({name, aliases, photo}) {
      const letters = name ? initials(name) : ''
      return {
        title: name || 'Unnamed speaker',
        subtitle: aliases?.length ? aliases.join(', ') : undefined,
        media: photo?.asset ? photo : letters ? <Initials text={letters} /> : undefined,
      }
    },
  },
})
