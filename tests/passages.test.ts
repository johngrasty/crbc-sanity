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
