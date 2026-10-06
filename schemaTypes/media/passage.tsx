// A scripture passage on a media item (contract section 3): a book, chapters and verses, and the
// text viewers read. The website and apps browse and filter by book.
import {BookOpen} from 'lucide-react'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {books} from './books'

// Contract section 10.2.
const MAX_PASSAGES = 20

export default defineType({
  name: 'passage',
  title: 'Passage',
  type: 'object',
  icon: BookOpen,
  fields: [
    defineField({
      name: 'book',
      title: 'Book',
      type: 'string',
      options: {list: books.map(({code, name}) => ({title: name, value: code}))},
    }),
    defineField({name: 'chapterStart', title: 'Start chapter', type: 'number'}),
    defineField({name: 'verseStart', title: 'Start verse', type: 'number'}),
    defineField({name: 'chapterEnd', title: 'End chapter', type: 'number'}),
    defineField({name: 'verseEnd', title: 'End verse', type: 'number'}),
    defineField({name: 'display', title: 'Display text', type: 'string'}),
  ],
})

export const passagesField = defineField({
  name: 'passages',
  title: 'Scripture passages',
  type: 'array',
  of: [defineArrayMember({type: 'passage'})],
  validation: (rule) =>
    rule.custom((value) => {
      const count = value?.length ?? 0
      return count <= MAX_PASSAGES
        ? true
        : `Use ${MAX_PASSAGES} passages or fewer. This has ${count}.`
    }),
})
