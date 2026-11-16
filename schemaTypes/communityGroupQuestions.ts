import {defineArrayMember, defineField, defineType} from 'sanity'
import {MessagesSquare} from 'lucide-react'

// One week's discussion guide for the Community Groups, shown at
// /ministries/community-groups/questions/<slug> on the website. The newest week by weekOf is the
// one the Community Groups page links to.

// Paragraphs with bold and italic only. The background is read aloud or skimmed before the
// question, so it has no headings, lists, links or images.
const plainParagraphs = defineArrayMember({
  type: 'block',
  styles: [{title: 'Normal', value: 'normal'}],
  lists: [],
  marks: {
    decorators: [
      {title: 'Bold', value: 'strong'},
      {title: 'Italic', value: 'em'},
    ],
    annotations: [],
  },
})

const formatWeek = (date?: string) => {
  if (!date) return undefined
  // A date field holds YYYY-MM-DD. Reading it as UTC noon keeps the day in every time zone.
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default defineType({
  name: 'communityGroupQuestions',
  title: 'Community Group Questions',
  type: 'document',
  icon: MessagesSquare,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The sermon or lesson title, such as "Sweet Contentment".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'passage',
      title: 'Passage',
      type: 'string',
      description:
        'The passage groups read together before they begin, such as "Philippians 4:10–13".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'weekOf',
      title: 'Week of',
      type: 'date',
      description:
        'The first day of the week the groups meet. The newest week is the one the Community Groups page links to.',
      options: {dateFormat: 'MMMM D, YYYY'},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      description: 'Click Generate after entering the title.',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'series',
      title: 'Sermon series',
      type: 'string',
      description: 'Optional, such as "Thankful Hearts".',
    }),
    defineField({
      name: 'sections',
      title: 'Discussion sections',
      type: 'array',
      description: 'One section per point of the sermon, in order.',
      validation: (Rule) => Rule.required().min(1),
      of: [
        defineArrayMember({
          name: 'questionSection',
          title: 'Section',
          type: 'object',
          fields: [
            defineField({
              name: 'heading',
              title: 'Heading',
              type: 'string',
              description: 'Such as "Paul\'s Joy".',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'verses',
              title: 'Verses',
              type: 'string',
              description: 'Optional, such as "v. 10" or "vv. 11–12".',
            }),
            defineField({
              name: 'background',
              title: 'Background',
              type: 'array',
              description: 'A short summary of this part of the sermon.',
              of: [plainParagraphs],
            }),
            defineField({
              name: 'question',
              title: 'Question',
              type: 'text',
              rows: 3,
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'followUp',
              title: 'Follow-up question',
              type: 'text',
              rows: 3,
            }),
          ],
          preview: {
            select: {title: 'heading', subtitle: 'verses'},
          },
        }),
      ],
    }),
    defineField({
      name: 'closingQuote',
      title: 'Closing quote',
      type: 'text',
      rows: 2,
      description: 'Optional. Leave out the quotation marks.',
    }),
    defineField({
      name: 'challenge',
      title: "This week's challenge",
      type: 'text',
      rows: 4,
    }),
  ],
  orderings: [
    {
      title: 'Week, newest first',
      name: 'weekOfDesc',
      by: [{field: 'weekOf', direction: 'desc'}],
    },
  ],
  preview: {
    select: {title: 'title', passage: 'passage', weekOf: 'weekOf'},
    prepare({title, passage, weekOf}) {
      const week = formatWeek(weekOf)
      return {
        title,
        subtitle: [passage, week && `Week of ${week}`].filter(Boolean).join(' · '),
      }
    },
  },
})
