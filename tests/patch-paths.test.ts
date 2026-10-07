// Patch paths name what a patch changes, as Sanity writes paths: title, editorHold.note,
// passages[_key=="a"].display or passages[0]. The form's follow-up runner and the harness read
// them the same way, so these tests cover both.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type TestDocument} from './harness.ts'

const draft = (passages: Record<string, unknown>[]): TestDocument => ({
  _id: 'drafts.item',
  _type: 'mediaItem',
  passages,
})
const passage = (key: string, fields: Record<string, unknown> = {}) => ({
  _key: key,
  _type: 'passage',
  book: 'Jas',
  chapterStart: 1,
  display: 'James 1',
  ...fields,
})
const displays = (document: TestDocument) =>
  (document.passages as {_key: string; display?: string}[]).map(({_key, display}) => [
    _key,
    display,
  ])

// Keys from an import or a paste can hold anything. Each case is a key and a path to it.
const keyedPaths: [string, string][] = [
  ['a.b', 'passages[_key=="a.b"].display'],
  ['a]b', 'passages[_key=="a]b"].display'],
  ['a[b', 'passages[_key=="a[b"].display'],
  // A quote written raw, as Sanity's own pathToString writes it, and escaped.
  ['a"b', 'passages[_key=="a"b"].display'],
  ['a"b', 'passages[_key=="a\\"b"].display'],
  ['a"]b', 'passages[_key=="a\\"]b"].display'],
  ["a'b", `passages[_key=="a'b"].display`],
  ["a'b", `passages[_key=='a\\'b'].display`],
  ['a\\b', 'passages[_key=="a\\\\b"].display'],
]

test('a keyed path reaches its item, whatever the key holds', async () => {
  for (const [key, path] of keyedPaths) {
    const studio = createHarness({documents: [draft([passage('other'), passage(key)])]})
    const edited = await studio.edit('item', {set: {[path]: 'Custom'}})
    assert.deepEqual(
      displays(edited),
      [
        ['other', 'James 1'],
        [key, 'Custom'],
      ],
      path,
    )
  }
})

test("a follow-up step's patch reaches its passage, whatever the key holds", async () => {
  for (const key of ['a.b', 'a]b', 'a[b', 'a"b', 'a"]b', "a'b", 'a\\b']) {
    const studio = createHarness({documents: [draft([passage(key)])]})
    const edited = await studio.edit('item', {set: {passages: [passage(key, {chapterStart: 2})]}})
    assert.deepEqual(displays(edited), [[key, 'James 2']], key)
  }
})

test('an index counts from 0, and one past the end changes nothing', async () => {
  const seeded = draft([passage('a'), passage('b')])

  const set = await createHarness({documents: [seeded]}).edit('item', {
    set: {'passages[1].display': 'Second'},
  })
  assert.deepEqual(displays(set), [
    ['a', 'James 1'],
    ['b', 'Second'],
  ])
  const unset = await createHarness({documents: [seeded]}).edit('item', {unset: ['passages[0]']})
  assert.deepEqual(displays(unset), [['b', 'James 1']])
  const past = await createHarness({documents: [seeded]}).edit('item', {unset: ['passages[5]']})
  assert.deepEqual(displays(past), displays(seeded))
})

test('a keyed path to a missing item changes nothing', async () => {
  const seeded = draft([passage('a')])
  for (const patch of [
    {set: {'passages[_key=="missing"].display': 'X'}},
    {unset: ['passages[_key=="missing"]']},
  ]) {
    const edited = await createHarness({documents: [seeded]}).edit('item', patch)
    assert.deepEqual(displays(edited), displays(seeded), JSON.stringify(patch))
  }
})

test('a path that could patch the wrong place is refused', async () => {
  const seeded = draft([passage('a'), passage('b')])
  for (const path of [
    // A negative index counts from the end. Steps name items by key, so it's refused.
    'passages[-1]',
    'passages[-1].display',
    'passages[0:1]',
    'passages[_key=="a"',
    'passages[_key=="a].display',
    'passages[_type=="passage"].display',
    'passages..display',
    '',
  ]) {
    const studio = createHarness({documents: [seeded]})
    await assert.rejects(studio.edit('item', {unset: [path]}), /path/i, `unset ${path}`)
    await assert.rejects(studio.edit('item', {set: {[path]: 'X'}}), /path/i, `set ${path}`)
    assert.deepEqual(studio.documents(), [seeded], path)
  }
})
