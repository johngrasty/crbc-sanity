import assert from 'node:assert/strict'
import {test} from 'node:test'
import contract from '../media-contract/schemas/media-v1.schema.json' with {type: 'json'}
import {createHarness, type Marker} from './harness.ts'

// The 66 books of the Protestant canon in order: the OSIS code (OSIS 2.1.1 User's Manual,
// appendix C.1), the chapter count (the KJV versification in CrossWire SWORD's
// include/canon.h) and the name an editor picks.
const canon = [
  'Gen 50 Genesis',
  'Exod 40 Exodus',
  'Lev 27 Leviticus',
  'Num 36 Numbers',
  'Deut 34 Deuteronomy',
  'Josh 24 Joshua',
  'Judg 21 Judges',
  'Ruth 4 Ruth',
  '1Sam 31 1 Samuel',
  '2Sam 24 2 Samuel',
  '1Kgs 22 1 Kings',
  '2Kgs 25 2 Kings',
  '1Chr 29 1 Chronicles',
  '2Chr 36 2 Chronicles',
  'Ezra 10 Ezra',
  'Neh 13 Nehemiah',
  'Esth 10 Esther',
  'Job 42 Job',
  'Ps 150 Psalms',
  'Prov 31 Proverbs',
  'Eccl 12 Ecclesiastes',
  'Song 8 Song of Solomon',
  'Isa 66 Isaiah',
  'Jer 52 Jeremiah',
  'Lam 5 Lamentations',
  'Ezek 48 Ezekiel',
  'Dan 12 Daniel',
  'Hos 14 Hosea',
  'Joel 3 Joel',
  'Amos 9 Amos',
  'Obad 1 Obadiah',
  'Jonah 4 Jonah',
  'Mic 7 Micah',
  'Nah 3 Nahum',
  'Hab 3 Habakkuk',
  'Zeph 3 Zephaniah',
  'Hag 2 Haggai',
  'Zech 14 Zechariah',
  'Mal 4 Malachi',
  'Matt 28 Matthew',
  'Mark 16 Mark',
  'Luke 24 Luke',
  'John 21 John',
  'Acts 28 Acts',
  'Rom 16 Romans',
  '1Cor 16 1 Corinthians',
  '2Cor 13 2 Corinthians',
  'Gal 6 Galatians',
  'Eph 6 Ephesians',
  'Phil 4 Philippians',
  'Col 4 Colossians',
  '1Thess 5 1 Thessalonians',
  '2Thess 3 2 Thessalonians',
  '1Tim 6 1 Timothy',
  '2Tim 4 2 Timothy',
  'Titus 3 Titus',
  'Phlm 1 Philemon',
  'Heb 13 Hebrews',
  'Jas 5 James',
  '1Pet 5 1 Peter',
  '2Pet 3 2 Peter',
  '1John 5 1 John',
  '2John 1 2 John',
  '3John 1 3 John',
  'Jude 1 Jude',
  'Rev 22 Revelation',
].map((line) => {
  const [, code, chapters, name] = /^(\S+) (\d+) (.+)$/.exec(line) as RegExpExecArray
  return {code, chapters: Number(chapters), name}
})

const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)
// Every error on the passages list or inside one of its passages.
const passageErrors = (markers: Marker[]) =>
  markers.filter((marker) => marker.level === 'error' && marker.path.startsWith('passages'))
// Every error inside the passage with this _key.
const errorsIn = (markers: Marker[], key: string) =>
  passageErrors(markers).filter(({path}) => path.startsWith(`passages[_key=="${key}"]`))

// A whole, valid passage, James 1:2-4. fields override or add to it.
const passage = (key: string, fields: Record<string, unknown> = {}) => ({
  _key: key,
  _type: 'passage',
  book: 'Jas',
  chapterStart: 1,
  verseStart: 2,
  verseEnd: 4,
  display: 'James 1:2-4',
  ...fields,
})

test('a media item holds up to 20 passages', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  const passages = Array.from({length: 21}, (_, index) => passage(`p${index}`))

  const atLimit = await studio.validate({...item, passages: passages.slice(0, 20)})
  assert.deepEqual(passageErrors(atLimit), [])
  const pastLimit = await studio.validate({...item, passages})
  assert.deepEqual(
    errorsAt(pastLimit, 'passages').map(({message}) => message),
    ['Use 20 passages or fewer. This has 21.'],
  )
})

test('the book list is the 66 books of the Protestant canon, by name', () => {
  // The Old Testament has 39 books and 929 chapters, and the New Testament 27 and 260.
  assert.equal(canon.length, 66)
  assert.equal(
    canon.reduce((total, {chapters}) => total + chapters, 0),
    929 + 260,
  )

  const studio = createHarness()
  assert.deepEqual(
    studio.choices('passage', 'book'),
    canon.map(({code, name}) => ({title: name, value: code})),
  )
})

test("every book code matches the contract's OSIS pattern", () => {
  const pattern = new RegExp(contract.$defs.OsisBook.pattern)
  const studio = createHarness()
  const codes = studio.choices('passage', 'book').map(({value}) => value)
  assert.equal(codes.length, 66)
  for (const code of codes) assert.match(String(code), pattern)
})

test('a passage needs a book from the list', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  for (const book of [undefined, '', 'Xyz', 'James', 'jas', 'Jas.']) {
    const markers = await studio.validate({...item, passages: [passage('a', {book})]})
    assert.notDeepEqual(errorsAt(markers, 'passages[_key=="a"].book'), [], `${book}`)
  }
})

test('every chapter must exist in its book, and the error says how many it has', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  for (const {code, chapters} of canon) {
    const passages = [
      passage('last', {book: code, chapterStart: chapters}),
      passage('next', {book: code, chapterStart: chapters + 1}),
      passage('end', {book: code, chapterStart: 1, chapterEnd: chapters + 1}),
    ]
    const markers = await studio.validate({...item, passages})
    assert.deepEqual(errorsIn(markers, 'last'), [], code)
    assert.equal(errorsAt(markers, 'passages[_key=="next"].chapterStart').length, 1, code)
    assert.equal(errorsAt(markers, 'passages[_key=="end"].chapterEnd').length, 1, code)
  }

  const messages = async (book: string, chapterStart: number) =>
    errorsAt(
      await studio.validate({...item, passages: [passage('a', {book, chapterStart})]}),
      'passages[_key=="a"].chapterStart',
    ).map(({message}) => message)
  assert.deepEqual(await messages('Jas', 6), ['James has 5 chapters.'])
  assert.deepEqual(await messages('Jude', 2), ['Jude has 1 chapter.'])
})

test('a passage needs a start chapter, a whole number from 1', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  const markers = async (chapterStart: unknown) =>
    errorsAt(
      await studio.validate({...item, passages: [passage('a', {chapterStart})]}),
      'passages[_key=="a"].chapterStart',
    )
  assert.deepEqual(await markers(1), [])
  for (const chapterStart of [undefined, 0, -1, 2.5]) {
    assert.notDeepEqual(await markers(chapterStart), [], `${chapterStart}`)
  }
})

test('verses run from 1 to 176', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  // Psalm 119, the longest chapter, has 176 verses.
  const psalm119 = (verseStart: unknown, verseEnd: unknown) =>
    passage('a', {book: 'Ps', chapterStart: 119, verseStart, verseEnd})
  const errorsOn = async (field: string, verseStart: unknown, verseEnd: unknown) =>
    errorsAt(
      await studio.validate({...item, passages: [psalm119(verseStart, verseEnd)]}),
      `passages[_key=="a"].${field}`,
    )

  assert.deepEqual(await errorsOn('verseStart', 1, 176), [])
  assert.deepEqual(await errorsOn('verseEnd', 1, 176), [])
  for (const verse of [0, 177, 1.5]) {
    assert.notDeepEqual(await errorsOn('verseStart', verse, undefined), [], `start ${verse}`)
    assert.notDeepEqual(await errorsOn('verseEnd', 1, verse), [], `end ${verse}`)
  }
})

test('an end verse needs a start verse', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  for (const fields of [{chapterEnd: undefined}, {chapterEnd: 2}]) {
    const markers = await studio.validate({
      ...item,
      passages: [passage('a', {...fields, verseStart: undefined, verseEnd: 4})],
    })
    assert.deepEqual(
      errorsAt(markers, 'passages[_key=="a"].verseEnd').map(({message}) => message),
      ['Add a start verse, or clear the end verse.'],
      `${fields.chapterEnd}`,
    )
  }
})

test("a passage's end can't come before its start", async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  const validate = async (fields: Record<string, unknown>) =>
    errorsIn(
      await studio.validate({
        ...item,
        passages: [passage('a', {book: 'John', chapterStart: 3, verseStart: 16, ...fields})],
      }),
      'a',
    ).map(({path, message}) => `${path.replace('passages[_key=="a"].', '')}: ${message}`)

  // John 3:16-18, 3:16 alone written as a range, 3:16-4:2 and chapters 3 to 4.
  assert.deepEqual(await validate({verseEnd: 18}), [])
  assert.deepEqual(await validate({chapterEnd: 3, verseEnd: 16}), [])
  assert.deepEqual(await validate({chapterEnd: 4, verseEnd: 2}), [])
  assert.deepEqual(await validate({verseStart: undefined, chapterEnd: 4, verseEnd: undefined}), [])

  assert.deepEqual(await validate({verseEnd: 15}), [
    "verseEnd: The end verse can't come before the start verse.",
  ])
  assert.deepEqual(await validate({chapterEnd: 3, verseEnd: 15}), [
    "verseEnd: The end verse can't come before the start verse.",
  ])
  assert.deepEqual(await validate({chapterEnd: 2, verseEnd: 18}), [
    "chapterEnd: The end chapter can't come before the start chapter.",
  ])
})

test('the display text is required and holds up to 200 characters', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  const errorsOn = async (display: unknown) =>
    errorsAt(
      await studio.validate({...item, passages: [passage('a', {display})]}),
      'passages[_key=="a"].display',
    )

  for (const display of [undefined, '']) {
    assert.notDeepEqual(await errorsOn(display), [], `${display}`)
  }
  // The limit counts Unicode code points. 😀 is two UTF-16 units.
  for (const character of ['é', '😀']) {
    assert.deepEqual(await errorsOn(character.repeat(200)), [], character)
    assert.equal((await errorsOn(character.repeat(201))).length, 1, character)
  }
})

test('a passage row shows the display text, and the reference under it when they differ', () => {
  const studio = createHarness()
  assert.deepEqual(studio.preview(passage('a')), {title: 'James 1:2-4'})
  assert.deepEqual(
    studio.preview(
      passage('a', {
        book: 'Matt',
        chapterStart: 5,
        verseStart: 1,
        chapterEnd: 7,
        verseEnd: 29,
        display: 'The Sermon on the Mount',
      }),
    ),
    {title: 'The Sermon on the Mount', subtitle: 'Matthew 5:1-7:29'},
  )
  assert.deepEqual(studio.preview({_type: 'passage', _key: 'a'}), {
    title: 'Untitled passage',
  })
})

test('without display text, a passage row shows the reference as Studio writes it', () => {
  const studio = createHarness()
  const reference = (fields: Record<string, unknown>) =>
    studio.preview({_type: 'passage', _key: 'a', ...fields}).title
  const cases: [Record<string, unknown>, string][] = [
    [{book: 'Jas', chapterStart: 1, verseStart: 2, verseEnd: 4}, 'James 1:2-4'],
    // As the contract's fixtures store it, with the end chapter repeated.
    [{book: 'Jas', chapterStart: 2, verseStart: 14, chapterEnd: 2, verseEnd: 26}, 'James 2:14-26'],
    [{book: 'Gen', chapterStart: 15, verseStart: 6}, 'Genesis 15:6'],
    [{book: 'Rom', chapterStart: 4}, 'Romans 4'],
    [{book: 'John', chapterStart: 3, verseStart: 16, verseEnd: 16}, 'John 3:16'],
    [{book: 'John', chapterStart: 3, verseStart: 16, chapterEnd: 4, verseEnd: 2}, 'John 3:16-4:2'],
    [{book: 'John', chapterStart: 3, chapterEnd: 4}, 'John 3-4'],
    [{book: '1Cor', chapterStart: 13}, '1 Corinthians 13'],
    [{book: 'Jude', chapterStart: 1, verseStart: 24, verseEnd: 25}, 'Jude 1:24-25'],
    // One psalm is a Psalm, and more than one are Psalms.
    [{book: 'Ps', chapterStart: 23}, 'Psalm 23'],
    [{book: 'Ps', chapterStart: 119, verseStart: 105}, 'Psalm 119:105'],
    [{book: 'Ps', chapterStart: 1, chapterEnd: 2}, 'Psalms 1-2'],
  ]
  for (const [fields, text] of cases) assert.equal(reference(fields), text, text)

  // Without the last verse of chapter 4, "from 3:16 to the end of chapter 4" has no short
  // form, so the editor writes it. A reference without a known book or start chapter has none.
  for (const fields of [
    {book: 'John', chapterStart: 3, verseStart: 16, chapterEnd: 4},
    {book: 'Jas'},
    {chapterStart: 1},
    {book: 'Xyz', chapterStart: 1},
  ]) {
    assert.equal(reference(fields), 'Untitled passage', JSON.stringify(fields))
  }
})

test('speakers, topics and passages share the People and scripture tab, after Details', () => {
  const studio = createHarness()
  const groups = studio.groups('mediaItem')
  const index = groups.findIndex(({title}) => title === 'People and scripture')
  assert.equal(groups[index - 1]?.title, 'Details')
  assert.deepEqual(
    groups[index].fields.filter((field) => ['speakers', 'topics', 'passages'].includes(field)),
    ['speakers', 'topics', 'passages'],
  )
  for (const field of ['speakers', 'topics', 'passages']) {
    const tabs = groups.filter(({fields}) => fields.includes(field)).map(({title}) => title)
    assert.deepEqual(tabs, ['People and scripture'], field)
  }
})

// The display text of the first passage after an edit to a new media item's draft.
async function displayEditor() {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  return async (patch: {set?: Record<string, unknown>; unset?: string[]}) => {
    const version = await studio.edit(item._id, patch)
    return (version.passages as {display?: string}[] | undefined)?.[0]?.display
  }
}
const a = 'passages[_key=="a"]'

test('Studio fills an empty display text as the editor picks the book, chapter and verses', async () => {
  const displayAfter = await displayEditor()
  assert.equal(
    await displayAfter({set: {passages: [{_key: 'a', _type: 'passage', book: 'Jas'}]}}),
    undefined,
  )
  assert.equal(await displayAfter({set: {[`${a}.chapterStart`]: 1}}), 'James 1')
  assert.equal(await displayAfter({set: {[`${a}.verseStart`]: 2}}), 'James 1:2')
  assert.equal(await displayAfter({set: {[`${a}.verseEnd`]: 4}}), 'James 1:2-4')
  assert.equal(await displayAfter({set: {[`${a}.book`]: 'Phil'}}), 'Philippians 1:2-4')
})

test('a pasted passage without display text gets one', async () => {
  const displayAfter = await displayEditor()
  const pasted = {_key: 'a', _type: 'passage', book: 'Rom', chapterStart: 4}
  assert.equal(await displayAfter({set: {passages: [pasted]}}), 'Romans 4')
})

test('display text an editor wrote stays when the reference changes', async () => {
  const displayAfter = await displayEditor()
  const written = passage('a', {display: 'Joy in trials'})
  assert.equal(await displayAfter({set: {passages: [written]}}), 'Joy in trials')
  assert.equal(await displayAfter({set: {[`${a}.verseEnd`]: 5}}), 'Joy in trials')

  // Cleared, it stays empty until the reference changes again.
  assert.equal(await displayAfter({unset: [`${a}.display`]}), undefined)
  assert.equal(await displayAfter({set: {[`${a}.verseEnd`]: 6}}), 'James 1:2-6')
})

test('opening a published item with a passage that lacks display text writes nothing', async () => {
  const published = {
    _id: 'item',
    _type: 'mediaItem',
    contentId: 'mi_01K6Z8Y4N3QJ5W2X7R9T0V1B2C',
    passages: [{_key: 'a', _type: 'passage', book: 'Rom', chapterStart: 4}],
  }
  const studio = createHarness({documents: [published]})
  assert.deepEqual(await studio.open('item'), published)
  assert.deepEqual(studio.documents(), [published])
})
