import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker, type TestDocument} from './harness.ts'

const ULID = '01K6Z8Y4N3QJ5W2X7R9T0V1B2C'
const OTHER_ULID = '01K6Z9A7H2MXW4Q8C5R3T6V0BD'

const slug = (current: string) => ({_type: 'slug', current})
const entries = (...slugs: string[]) =>
  slugs.map((current, index) => ({_key: `h${index}`, ...slug(current)}))
const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)
const item = (fields: Record<string, unknown> = {}): TestDocument => ({
  _id: 'item',
  _type: 'mediaItem',
  contentId: `mi_${ULID}`,
  kind: 'service',
  title: 'Easter Sunday',
  serviceDate: '2026-04-05',
  serviceTimezone: 'America/New_York',
  ...fields,
})
const slugOf = (document: TestDocument) =>
  (document.slug as {current?: string} | undefined)?.current
// The slugs in a document's history, in order.
const history = (document: TestDocument) =>
  ((document.slugHistory ?? []) as {current: string}[]).map(({current}) => current)

test("changing a published item's slug keeps the old slug in the history", async () => {
  const studio = createHarness({documents: [item({slug: slug('easter')})]})
  const draft = await studio.edit('item', {set: {slug: slug('easter-sunday')}})
  assert.deepEqual(history(draft), ['easter'])
})

test('two published slug changes stay in the history in order', async () => {
  const studio = createHarness({documents: [item({slug: slug('easter')})]})
  await studio.edit('item', {set: {slug: slug('easter-sunday')}})
  await studio.publish('item')
  await studio.edit('item', {set: {slug: slug('easter-sunday-2026')}})
  const published = await studio.publish('item')
  assert.equal(slugOf(published), 'easter-sunday-2026')
  assert.deepEqual(history(published), ['easter', 'easter-sunday'])
})

test('changing back to an old slug takes it out of the history', async () => {
  const studio = createHarness({documents: [item({slug: slug('easter')})]})
  await studio.edit('item', {set: {slug: slug('easter-sunday')}})
  await studio.publish('item')
  await studio.edit('item', {set: {slug: slug('easter')}})
  const published = await studio.publish('item')
  assert.equal(slugOf(published), 'easter')
  assert.deepEqual(history(published), ['easter-sunday'])
})

test('a slug that was never published stays out of the history', async () => {
  const studio = createHarness({documents: [item({slug: slug('easter')})]})
  await studio.edit('item', {set: {slug: slug('easter-sunday')}})
  const draft = await studio.edit('item', {set: {slug: slug('easter-sunday-2026')}})
  assert.deepEqual(history(draft), ['easter'])
  assert.deepEqual(history(await studio.publish('item')), ['easter'])
})

test('slug changes before the first publish leave no history', async () => {
  const studio = createHarness()
  const {_id} = await studio.create('mediaItem')
  await studio.edit(_id, {set: {title: 'Easter', slug: slug('easter')}})
  const draft = await studio.edit(_id, {set: {slug: slug('easter-sunday')}})
  assert.deepEqual(history(draft), [])
  assert.deepEqual(history(await studio.publish(_id)), [])
})

test('a slug change in a release keeps its history through publishing the release', async () => {
  const studio = createHarness({
    documents: [item({slug: slug('easter'), slugHistory: [{_key: 'h1', ...slug('resurrection')}]})],
  })
  const version = await studio.edit(
    'item',
    {set: {slug: slug('easter-sunday')}},
    {release: 'rSpring'},
  )
  assert.equal(version._id, 'versions.rSpring.item')
  assert.deepEqual(history(version), ['resurrection', 'easter'])
  const published = await studio.publish('item', {release: 'rSpring'})
  assert.equal(slugOf(published), 'easter-sunday')
  assert.deepEqual(history(published), ['resurrection', 'easter'])
})

test('a version written without the history it owes is an error, and it cannot publish', async () => {
  const published = item({slug: slug('easter-sunday'), slugHistory: entries('easter')})
  // Each skips the form: a changed slug with no history, an unchanged slug that drops the
  // published history, a changed slug that drops it, and a current slug in its own history.
  const written = [
    {slug: slug('easter-2026'), slugHistory: undefined},
    {slug: slug('easter-sunday'), slugHistory: undefined},
    {slug: slug('easter-2026'), slugHistory: entries('easter-sunday')},
    {slug: slug('easter-2026'), slugHistory: entries('easter', 'easter-sunday', 'easter-2026')},
  ]
  for (const [index, fields] of written.entries()) {
    for (const [_id, release] of [
      ['drafts.item', undefined],
      ['versions.rSpring.item', 'rSpring'],
    ] as const) {
      const studio = createHarness({documents: [published, item({_id, ...fields})]})
      const markers = await studio.validate(_id)
      assert.equal(errorsAt(markers, 'slugHistory').length, 1, `${_id} ${index}`)
      await assert.rejects(studio.publish('item', {release}), /slugHistory/, `${_id} ${index}`)
    }
  }
  const studio = createHarness({
    documents: [
      published,
      item({_id: 'drafts.item', ...written[2], slugHistory: entries('easter', 'easter-sunday')}),
    ],
  })
  assert.deepEqual(errorsAt(await studio.validate('drafts.item'), 'slugHistory'), [])
})

test("a slug another item uses now or used before is an error, in any of that item's versions", async () => {
  const other = (_id: string, fields: Record<string, unknown>) => ({...item({_id}), ...fields})
  const taken = [
    {slug: slug('easter')},
    {slug: slug('easter-2026'), slugHistory: entries('resurrection', 'easter')},
  ]
  for (const fields of taken) {
    for (const _id of ['other', 'drafts.other', 'versions.rSpring.other']) {
      const studio = createHarness({documents: [other(_id, fields)]})
      const markers = await studio.validate(item({_id: 'drafts.item', slug: slug('easter')}))
      // Editors see one message, whichever way the slug is taken.
      assert.deepEqual(
        markers.filter(({path}) => path === 'slug').map(({level, message}) => [level, message]),
        [['error', 'Slug is already in use']],
        `${_id} ${JSON.stringify(fields)}`,
      )
    }
  }
})

test("an item's own versions and other types don't count against its slug", async () => {
  const studio = createHarness({
    documents: [
      item({slug: slug('easter-sunday'), slugHistory: entries('easter')}),
      item({
        _id: 'versions.rSpring.item',
        slug: slug('easter'),
        slugHistory: entries('easter-sunday'),
      }),
      {_id: 'gospel', _type: 'series', slug: slug('easter'), slugHistory: entries('easter-sunday')},
    ],
  })
  // Changing back to the old slug, while the release changes it too.
  const draft = item({
    _id: 'drafts.item',
    slug: slug('easter'),
    slugHistory: entries('easter-sunday'),
  })
  assert.deepEqual(errorsAt(await studio.validate(draft), 'slug'), [])
})

test('a history entry another item uses now or used before is an error, which catches a pasted history', async () => {
  const studio = createHarness({
    documents: [
      item({slug: slug('easter'), slugHistory: entries('resurrection')}),
      item({_id: 'palms', contentId: `mi_${OTHER_ULID}`, slug: slug('palm-sunday')}),
      item({_id: 'drafts.lent', slug: slug('lent-2026'), slugHistory: entries('lent')}),
    ],
  })
  // A whole-document paste writes into read-only fields, the history included.
  const draft = await studio.edit('item', {
    set: {slugHistory: entries('palm-sunday', 'lent', 'easter-sunday')},
  })
  const slugAt = new Map(
    (draft.slugHistory as {_key: string; current: string}[]).map(({_key, current}) => [
      `slugHistory[_key=="${_key}"]`,
      current,
    ]),
  )
  const flagged = (await studio.validate(draft._id))
    .filter(({level, path}) => level === 'error' && slugAt.has(path))
    .map(({path, message}) => [slugAt.get(path), message])
  assert.deepEqual(flagged, [
    ['palm-sunday', 'Slug is already in use'],
    ['lent', 'Slug is already in use'],
  ])
})

test("slugs and history entries match the contract's pattern of lower-case words and hyphens", async () => {
  const studio = createHarness()
  const atEntry = 'slugHistory[_key=="h0"]'
  for (const valid of ['easter', 'easter-sunday-2026', '1-john']) {
    const markers = await studio.validate(item({slug: slug(valid), slugHistory: entries(valid)}))
    assert.deepEqual([...errorsAt(markers, 'slug'), ...errorsAt(markers, atEntry)], [], valid)
  }
  const invalid = [
    'Easter',
    'easter_sunday',
    '-easter',
    'easter-',
    'easter--sunday',
    'easter sunday',
    'pâques',
  ]
  for (const value of invalid) {
    const markers = await studio.validate(item({slug: slug(value), slugHistory: entries(value)}))
    assert.equal(errorsAt(markers, 'slug').length, 1, value)
    assert.equal(errorsAt(markers, atEntry).length, 1, value)
  }
})

test('slugs and history entries hold up to 200 characters, counted as code points', async () => {
  const studio = createHarness()
  const atEntry = 'slugHistory[_key=="h0"]'
  const errorCounts = async (value: string) => {
    const markers = await studio.validate(item({slug: slug(value), slugHistory: entries(value)}))
    return [errorsAt(markers, 'slug').length, errorsAt(markers, atEntry).length]
  }
  assert.deepEqual(await errorCounts('a'.repeat(200)), [0, 0])
  assert.deepEqual(await errorCounts('a'.repeat(201)), [1, 1])
  // An emoji is one code point and two UTF-16 units. The pattern refuses it, so the limit adds
  // a second error only past 200 code points.
  assert.deepEqual(await errorCounts('😀'.repeat(200)), [1, 1])
  assert.deepEqual(await errorCounts('😀'.repeat(201)), [2, 2])
})

test('a media item without a slug has a warning, not an error, so a placeholder can publish', async () => {
  const studio = createHarness()
  const {_id} = await studio.create('mediaItem')
  const markers = await studio.validate(_id)
  assert.deepEqual(
    markers.filter(({path}) => path === 'slug').map(({level}) => level),
    ['warning'],
  )
  await studio.publish(_id)
})
