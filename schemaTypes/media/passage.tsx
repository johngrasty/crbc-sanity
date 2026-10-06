// A scripture passage on a media item (contract section 3): a book, chapters and verses, and the
// text viewers read. The website and apps browse and filter by book.
import {BookOpen} from 'lucide-react'
import {useEffect, useRef} from 'react'
import {
  defineArrayMember,
  defineField,
  defineType,
  set,
  type ObjectInputProps,
  type ValidationContext,
} from 'sanity'
import contract from '../../media-contract/schemas/media-v1.schema.json' with {type: 'json'}
import {bookFor, books} from './books'
import {labelLimit} from './limits'
import {itemLimit} from './lists'

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

const isCount = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 1

// The reference as Studio writes it, such as James 1:2-4, John 3:16-4:2 or Psalm 23. There is
// none without a known book and start chapter. There is none either for a passage that starts at
// a verse and runs to the end of a later chapter, which would need that chapter's last verse.
export function referenceText(passage: PassageValue | undefined): string | undefined {
  const {chapterStart, verseStart, chapterEnd, verseEnd} = passage ?? {}
  const book = bookFor(passage?.book)
  if (!book || !isCount(chapterStart)) return undefined
  const endChapter = isCount(chapterEnd) && chapterEnd !== chapterStart ? chapterEnd : undefined
  const start = isCount(verseStart) ? `${chapterStart}:${verseStart}` : `${chapterStart}`
  let end = ''
  if (endChapter === undefined) {
    if (isCount(verseStart) && isCount(verseEnd) && verseEnd !== verseStart) end = `-${verseEnd}`
  } else if (!isCount(verseStart)) {
    end = `-${endChapter}`
  } else if (isCount(verseEnd)) {
    end = `-${endChapter}:${verseEnd}`
  } else {
    return undefined
  }
  // One psalm is Psalm 23. More than one are Psalms 1-2.
  const name = book.code === 'Ps' && endChapter === undefined ? 'Psalm' : book.name
  return `${name} ${start}${end}`
}

// The display text a change to a passage should leave, or undefined to leave it as it is. When
// the reference changes, an empty display text gets the new reference. So does one that still
// reads as Studio wrote it for the reference before the change. Wording an editor chose stays.
export function displayAfterChange(
  before: PassageValue | undefined,
  after: PassageValue | undefined,
): string | undefined {
  const previous = referenceText(before)
  const next = referenceText(after)
  if (next === undefined || next === previous || after?.display === next) return undefined
  return !after?.display?.trim() || after.display === previous ? next : undefined
}

// Fills the display text in as the editor picks the book, chapters and verses. Its first run
// compares against no passage at all, so a passage that opens with an empty display text gets
// one. Patching during render throws, so it runs in an effect. A read-only form, such as one
// that hasn't loaded yet, refuses any patch, so the input waits until it can write.
function PassageInput(props: ObjectInputProps) {
  const {onChange, readOnly} = props
  const value = props.value as PassageValue | undefined
  const previous = useRef<PassageValue | undefined>(undefined)

  useEffect(() => {
    if (readOnly) return
    const before = previous.current
    previous.current = value
    if (before === value) return
    const display = displayAfterChange(before, value)
    if (display !== undefined) onChange(set(display, ['display']))
  }, [onChange, readOnly, value])

  return props.renderDefault(props)
}

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

// The end chapter can't come before the start chapter.
function chapterEndProblem(chapterEnd: number | undefined, context: ValidationContext) {
  const problem = chapterProblem(chapterEnd, context)
  if (problem !== true || isMissing(chapterEnd)) return problem
  const {chapterStart} = passageOf(context)
  return isMissing(chapterStart) || chapterEnd >= chapterStart
    ? true
    : "The end chapter can't come before the start chapter."
}

// An end verse needs a start verse. In a passage within one chapter, it can't come before it.
function verseEndProblem(verseEnd: number | undefined, context: ValidationContext) {
  const problem = verseProblem(verseEnd)
  if (problem !== true || isMissing(verseEnd)) return problem
  const {chapterStart, verseStart, chapterEnd} = passageOf(context)
  if (isMissing(verseStart)) return 'Add a start verse, or clear the end verse.'
  const oneChapter = isMissing(chapterEnd) || chapterEnd === chapterStart
  return !oneChapter || verseEnd >= verseStart
    ? true
    : "The end verse can't come before the start verse."
}

export default defineType({
  name: 'passage',
  title: 'Passage',
  type: 'object',
  icon: BookOpen,
  fieldsets: [
    {name: 'start', title: 'Start', options: {columns: 2}},
    {name: 'end', title: 'End', options: {columns: 2}},
  ],
  components: {input: PassageInput},
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
      title: 'Chapter',
      type: 'number',
      fieldset: 'start',
      validation: (rule) => [rule.required(), rule.custom(chapterProblem)],
    }),
    defineField({
      name: 'verseStart',
      title: 'Verse',
      type: 'number',
      description: 'Leave empty to start at the beginning of the chapter.',
      fieldset: 'start',
      validation: (rule) => rule.custom(verseProblem),
    }),
    defineField({
      name: 'chapterEnd',
      title: 'Chapter',
      type: 'number',
      description: 'Only for a passage that runs into a later chapter.',
      fieldset: 'end',
      validation: (rule) => rule.custom(chapterEndProblem),
    }),
    defineField({
      name: 'verseEnd',
      title: 'Verse',
      type: 'number',
      description: 'Leave empty for a single verse or whole chapters.',
      fieldset: 'end',
      validation: (rule) => rule.custom(verseEndProblem),
    }),
    defineField({
      name: 'display',
      title: 'Display text',
      type: 'string',
      description:
        'What viewers read, such as James 1:2-4. Studio fills it in from the book, chapters and verses, and you can change the wording.',
      validation: (rule) => [rule.required(), labelLimit(rule)],
    }),
  ],
  // The row shows what viewers read, with the reference under it when the wording differs.
  preview: {
    select: {
      book: 'book',
      chapterStart: 'chapterStart',
      verseStart: 'verseStart',
      chapterEnd: 'chapterEnd',
      verseEnd: 'verseEnd',
      display: 'display',
    },
    prepare(passage: PassageValue) {
      const reference = referenceText(passage)
      const title = passage.display?.trim() || reference || 'Untitled passage'
      return {title, subtitle: reference === title ? undefined : reference}
    },
  },
})

export const passagesField = defineField({
  name: 'passages',
  title: 'Scripture passages',
  type: 'array',
  description:
    'The Bible passages the sermon or service covers, up to 20. Viewers can find recordings by book on the website and in the apps.',
  of: [defineArrayMember({type: 'passage'})],
  validation: (rule) => itemLimit(rule, MAX_PASSAGES, 'passages'),
})
