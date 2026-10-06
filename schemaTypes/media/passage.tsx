// A scripture passage on a media item (contract section 3): a book, chapters and verses, and the
// text viewers read. The website and apps browse and filter by book.
import {BookOpen} from 'lucide-react'
import {defineArrayMember, defineField, defineType, type ValidationContext} from 'sanity'
import contract from '../../media-contract/schemas/media-v1.schema.json' with {type: 'json'}
import {bookFor, books} from './books'

// Contract section 10.2.
const MAX_PASSAGES = 20
// Psalm 119 has 176 verses, the most of any chapter. The contract caps every verse there.
const MAX_VERSE: number = contract.$defs.Passage.properties.verseStart.maximum

// A passage as Studio stores it. Any field can be missing while an editor fills it in.
export type PassageValue = {
  book?: string
  chapterStart?: number
  verseStart?: number
  chapterEnd?: number
  verseEnd?: number
  display?: string
}

const isMissing = (value: unknown): value is undefined | null =>
  value === undefined || value === null

// The passage that a rule on one of its fields checks.
const passageOf = (context: ValidationContext) => (context.parent ?? {}) as PassageValue

// A verse is a whole number from 1 to 176.
function verseProblem(verse: number | undefined) {
  if (isMissing(verse)) return true
  if (!Number.isInteger(verse)) return 'Use a whole number.'
  return verse >= 1 && verse <= MAX_VERSE ? true : `Use a verse from 1 to ${MAX_VERSE}.`
}

// A chapter is a whole number from 1 to the number of chapters in the passage's book.
function chapterProblem(chapter: number | undefined, context: ValidationContext) {
  if (isMissing(chapter)) return true
  if (!Number.isInteger(chapter)) return 'Use a whole number.'
  if (chapter < 1) return 'Chapters start at 1.'
  const book = bookFor(passageOf(context).book)
  if (!book || chapter <= book.chapters) return true
  return `${book.name} has ${book.chapters} ${book.chapters === 1 ? 'chapter' : 'chapters'}.`
}

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
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'chapterStart',
      title: 'Start chapter',
      type: 'number',
      validation: (rule) => [rule.required(), rule.custom(chapterProblem)],
    }),
    defineField({
      name: 'verseStart',
      title: 'Start verse',
      type: 'number',
      validation: (rule) => rule.custom(verseProblem),
    }),
    defineField({
      name: 'chapterEnd',
      title: 'End chapter',
      type: 'number',
      validation: (rule) => rule.custom(chapterProblem),
    }),
    defineField({
      name: 'verseEnd',
      title: 'End verse',
      type: 'number',
      validation: (rule) => rule.custom(verseProblem),
    }),
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
