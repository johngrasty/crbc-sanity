import {defineField, defineType, type StringRule} from 'sanity'
import {Mic} from 'lucide-react'
import {speakerInitials} from '../../media-contract/src/initials'
import {editorialIdField} from './editorialId'
import {aliasesField} from './aliases'
import {labelLimit} from './limits'
import {sameNameWarning} from './sameName'
import {sourceField} from './source'

// A warning when the name gives no initials, so the editor knows the website shows an empty
// circle. speakerInitials is the website's rule (contract section 10.2, erratum E45): each
// letter folds to at most one letter from A to Z, and a name with none left has no initials. A
// missing name gets the required error instead, not this warning.
const noInitialsWarning = (rule: StringRule) =>
  rule
    .custom((value) =>
      !value || speakerInitials(value)
        ? true
        : 'This name gives no initials from A to Z, so the website will show an empty circle for this speaker.',
    )
    .warning()

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
        noInitialsWarning(rule),
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
        "A head-and-shoulders photo. The website always shows the speaker's initials instead of the photo. No app shows the photo yet.",
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
      const letters = name ? speakerInitials(name) : undefined
      return {
        title: name || 'Unnamed speaker',
        subtitle: aliases?.length ? aliases.join(', ') : undefined,
        media: photo?.asset ? photo : letters ? <Initials text={letters} /> : undefined,
      }
    },
  },
})
