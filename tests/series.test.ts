import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker, type TestDocument} from './harness.ts'

// Contract section 2: the series prefix and a ULID, 26 characters of Crockford base32.
const SERIES_ID = /^se_[0-9A-HJKMNP-TV-Z]{26}$/

const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)

// é is one UTF-16 unit and two UTF-8 bytes. 😀 is one code point and two UTF-16 units. The
// contract's JSON Schema counts code points, so both count as one character.
const characters = ['é', '😀']

const ULID = '01K6Z8Y4N3QJ5W2X7R9T0V1B2C'
const OTHER_ULID = '01K6Z9A7H2MXW4Q8C5R3T6V0BD'

const slug = (current: string) => ({_type: 'slug', current})
const entries = (...slugs: string[]) =>
  slugs.map((current, index) => ({_key: `h${index}`, ...slug(current)}))
const series = (fields: Record<string, unknown> = {}): TestDocument => ({
  _id: 'gospel',
  _type: 'series',
  seriesId: `se_${ULID}`,
  title: 'The Gospel of John',
  ordering: 'newestFirst',
  ...fields,
})
const slugOf = (document: TestDocument) =>
  (document.slug as {current?: string} | undefined)?.current
// The slugs in a document's history, in order.
const history = (document: TestDocument) =>
  ((document.slugHistory ?? []) as {current: string}[]).map(({current}) => current)

test('a new series gets a well-formed series ID, two new ones differ, and it starts newest first', async () => {
  const studio = createHarness()
  const first = await studio.create('series')
  const second = await studio.create('series')
  assert.match(String(first.seriesId), SERIES_ID)
  assert.match(String(second.seriesId), SERIES_ID)
  assert.notEqual(first.seriesId, second.seriesId)
  assert.equal(first.ordering, 'newestFirst')
})

test('a series title is required and holds up to 200 characters, counted as code points', async () => {
  const studio = createHarness()
  const created = await studio.create('series')
  for (const title of [undefined, '']) {
    assert.equal(errorsAt(await studio.validate({...created, title}), 'title').length, 1, title)
  }
  for (const character of characters) {
    const atLimit = await studio.validate({...created, title: character.repeat(200)})
    assert.deepEqual(errorsAt(atLimit, 'title'), [], `200 × ${character}`)
    const pastLimit = await studio.validate({...created, title: character.repeat(201)})
    assert.equal(errorsAt(pastLimit, 'title').length, 1, `201 × ${character}`)
  }
})

test('a series description holds up to 5,000 characters, counted as code points', async () => {
  const studio = createHarness()
  const created = await studio.create('series')
  for (const character of characters) {
    const atLimit = await studio.validate({...created, description: character.repeat(5000)})
    assert.deepEqual(errorsAt(atLimit, 'description'), [], `5,000 × ${character}`)
    const pastLimit = await studio.validate({...created, description: character.repeat(5001)})
    assert.equal(errorsAt(pastLimit, 'description').length, 1, `5,001 × ${character}`)
  }
})

test('ordering is required and is newest first, oldest first or manual', async () => {
  const studio = createHarness()
  const created = await studio.create('series')
  for (const ordering of ['newestFirst', 'oldestFirst', 'manual']) {
    assert.deepEqual(errorsAt(await studio.validate({...created, ordering}), 'ordering'), [])
  }
  // A missing value is one error. A value off the list gets Sanity's list error.
  assert.equal(
    errorsAt(await studio.validate({...created, ordering: undefined}), 'ordering').length,
    1,
  )
  assert.ok(errorsAt(await studio.validate({...created, ordering: 'byTitle'}), 'ordering').length)
})

test("changing a published series' slug keeps the old slugs in order, and changing back takes one out", async () => {
  const studio = createHarness({documents: [series({slug: slug('john')})]})
  assert.deepEqual(history(await studio.edit('gospel', {set: {slug: slug('gospel-of-john')}})), [
    'john',
  ])
  await studio.publish('gospel')
  await studio.edit('gospel', {set: {slug: slug('john-2026')}})
  const twice = await studio.publish('gospel')
  assert.equal(slugOf(twice), 'john-2026')
  assert.deepEqual(history(twice), ['john', 'gospel-of-john'])
  await studio.edit('gospel', {set: {slug: slug('john')}})
  const back = await studio.publish('gospel')
  assert.equal(slugOf(back), 'john')
  assert.deepEqual(history(back), ['gospel-of-john', 'john-2026'])
})

test('a slug change in a release keeps its history through publishing the release', async () => {
  const studio = createHarness({
    documents: [series({slug: slug('john'), slugHistory: entries('the-gospel')})],
  })
  const version = await studio.edit(
    'gospel',
    {set: {slug: slug('gospel-of-john')}},
    {release: 'rSpring'},
  )
  assert.equal(version._id, 'versions.rSpring.gospel')
  assert.deepEqual(history(version), ['the-gospel', 'john'])
  const published = await studio.publish('gospel', {release: 'rSpring'})
  assert.equal(slugOf(published), 'gospel-of-john')
  assert.deepEqual(history(published), ['the-gospel', 'john'])
})

test('a series version written without the history it owes is an error, and it cannot publish', async () => {
  const published = series({slug: slug('gospel-of-john'), slugHistory: entries('john')})
  // Each skips the form: a changed slug with no history, an unchanged slug that drops the
  // published history, and a current slug in its own history.
  const written = [
    {slug: slug('john-2026'), slugHistory: undefined},
    {slug: slug('gospel-of-john'), slugHistory: undefined},
    {slug: slug('john-2026'), slugHistory: entries('john', 'gospel-of-john', 'john-2026')},
  ]
  for (const [index, fields] of written.entries()) {
    for (const [_id, release] of [
      ['drafts.gospel', undefined],
      ['versions.rSpring.gospel', 'rSpring'],
    ] as const) {
      const studio = createHarness({documents: [published, series({_id, ...fields})]})
      assert.equal(errorsAt(await studio.validate(_id), 'slugHistory').length, 1, `${_id} ${index}`)
      await assert.rejects(studio.publish('gospel', {release}), /slugHistory/, `${_id} ${index}`)
    }
  }
})

test("a slug another series uses now or used before is an error, but a media item's slug isn't", async () => {
  const taken = [{slug: slug('john')}, {slug: slug('john-2026'), slugHistory: entries('john')}]
  for (const fields of taken) {
    for (const _id of ['luke', 'drafts.luke', 'versions.rSpring.luke']) {
      const other = series({_id, seriesId: `se_${OTHER_ULID}`, ...fields})
      const studio = createHarness({documents: [other]})
      const markers = await studio.validate(series({_id: 'drafts.gospel', slug: slug('john')}))
      assert.deepEqual(
        markers.filter(({path}) => path === 'slug').map(({level, message}) => [level, message]),
        [['error', 'Slug is already in use']],
        `${_id} ${JSON.stringify(fields)}`,
      )
    }
  }
  // Media items and series are separate namespaces.
  const studio = createHarness({
    documents: [
      {_id: 'item', _type: 'mediaItem', slug: slug('john'), slugHistory: entries('gospel-of-john')},
    ],
  })
  const markers = await studio.validate(
    series({_id: 'drafts.gospel', slug: slug('john'), slugHistory: entries('gospel-of-john')}),
  )
  assert.deepEqual(errorsAt(markers, 'slug'), [])
  assert.deepEqual(
    markers.filter(({path}) => path.startsWith('slugHistory[')),
    [],
  )
})

test("a series slug matches the contract's pattern and holds up to 200 characters", async () => {
  const studio = createHarness()
  for (const valid of ['john', 'gospel-of-john-2026', 'a'.repeat(200)]) {
    assert.deepEqual(
      errorsAt(await studio.validate(series({slug: slug(valid)})), 'slug'),
      [],
      valid,
    )
  }
  for (const invalid of ['John', 'gospel_of_john', 'gospel--john', 'a'.repeat(201)]) {
    const markers = await studio.validate(series({slug: slug(invalid)}))
    assert.equal(errorsAt(markers, 'slug').length, 1, invalid)
  }
})

test('a series without a slug is an error, so it cannot publish without one', async () => {
  const studio = createHarness()
  const created = await studio.create('series')
  const draft = await studio.edit(created._id, {set: {title: 'The Gospel of John'}})
  assert.deepEqual(
    (await studio.validate(draft._id)).filter(({path}) => path === 'slug').map(({level}) => level),
    ['error'],
  )
  await assert.rejects(studio.publish(draft._id), /slug: Add a slug\. Generate makes one/)
  // Generate makes the slug from the title.
  assert.equal(await studio.generateSlug(draft._id), 'the-gospel-of-john')
  await studio.edit(draft._id, {set: {slug: slug('the-gospel-of-john')}})
  const published = await studio.publish(draft._id)
  assert.equal(slugOf(published), 'the-gospel-of-john')
  assert.deepEqual(history(published), [])
})

test('opening a published series creates no draft, and a stale draft catches up', async () => {
  const studio = createHarness({documents: [series({slug: slug('john')})]})
  await studio.open('gospel')
  assert.deepEqual(
    studio.documents().map(({_id}) => _id),
    ['gospel'],
  )
  await studio.edit('gospel', {set: {description: 'A year in John.'}})
  await studio.edit('gospel', {set: {slug: slug('gospel-of-john')}}, {release: 'rSpring'})
  await studio.publish('gospel', {release: 'rSpring'})
  assert.equal(errorsAt(await studio.validate('drafts.gospel'), 'slugHistory').length, 1)
  assert.deepEqual(history(await studio.open('gospel')), ['gospel-of-john'])
  assert.deepEqual(errorsAt(await studio.validate('drafts.gospel'), 'slugHistory'), [])
})

// What the importer writes (contract sections 2 and 3).
const source = {
  sourceId: 'subsplash:se:+abc123',
  sourceUrl: 'https://subsplash.com/crbc/media/se/+abc123',
  originalPublishedAt: '2024-03-31T13:00:00Z',
}

test("a source ID another series uses is an error, but its own versions and other types' don't count", async () => {
  for (const other of ['luke', 'drafts.luke', 'versions.rSpring.luke']) {
    const studio = createHarness({documents: [series({_id: other, source})]})
    const markers = await studio.validate(series({_id: 'drafts.gospel', source}))
    assert.equal(errorsAt(markers, 'source.sourceId').length, 1, other)
  }
  const studio = createHarness({
    documents: [
      series({source}),
      series({_id: 'versions.rSpring.gospel', source}),
      {_id: 'pastor', _type: 'speaker', source},
      {_id: 'item', _type: 'mediaItem', source},
    ],
  })
  for (const _id of ['gospel', 'versions.rSpring.gospel']) {
    assert.deepEqual(errorsAt(await studio.validate(_id), 'source.sourceId'), [], _id)
  }
  const markers = await studio.validate(series({_id: 'drafts.gospel', source}))
  assert.deepEqual(
    markers.filter(({path}) => path.startsWith('source')),
    [],
  )
})

// Sanity names an image asset by its hash, its width and height, and its format.
const assetId = (width: number, height: number) =>
  `image-${'5e1f'.repeat(10)}-${width}x${height}-jpg`
const picture = (width: number, height: number, fields: Record<string, unknown> = {}) => ({
  _type: 'image',
  asset: {_type: 'reference', _ref: assetId(width, height)},
  ...fields,
})
const assets = (...sizes: [number, number][]) =>
  sizes.map(([width, height]) => ({_id: assetId(width, height), _type: 'sanity.imageAsset'}))
const warningsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'warning' && marker.path === path)

test("a thumbnail more than 2% from 16:9 is a warning, by the asset's own width and height", async () => {
  // 1632 × 900 and 1568 × 900 are exactly 2% wider and narrower than 16:9.
  const widescreen: [number, number][] = [
    [1920, 1080],
    [1280, 720],
    [1632, 900],
    [1568, 900],
  ]
  const otherShapes: [number, number][] = [
    [1633, 900],
    [1567, 900],
    [1600, 1200],
    [1080, 1920],
  ]
  const studio = createHarness({documents: assets(...widescreen, ...otherShapes)})
  for (const [width, height] of widescreen) {
    const markers = await studio.validate(series({artwork: {thumbnail: picture(width, height)}}))
    assert.deepEqual(
      markers.filter(({path}) => path.startsWith('artwork')),
      [],
      `${width}x${height}`,
    )
  }
  for (const [width, height] of otherShapes) {
    const markers = await studio.validate(series({artwork: {thumbnail: picture(width, height)}}))
    assert.deepEqual(
      markers.filter(({path}) => path.startsWith('artwork')).map(({path, level}) => [path, level]),
      [['artwork.thumbnail', 'warning']],
      `${width}x${height}`,
    )
  }
  // A crop to 16:9 doesn't change the picture the asset holds.
  const cropped = picture(1600, 1200, {
    crop: {_type: 'sanity.imageCrop', top: 0.125, bottom: 0.125, left: 0, right: 0},
  })
  const markers = await studio.validate(series({artwork: {thumbnail: cropped}}))
  assert.equal(warningsAt(markers, 'artwork.thumbnail').length, 1)
  assert.match(warningsAt(markers, 'artwork.thumbnail')[0].message, /1600 × 1200/)
})

test('a banner can have any shape, and artwork can be left out', async () => {
  const studio = createHarness({documents: assets([3000, 1000], [1080, 1920])})
  for (const artwork of [
    undefined,
    {},
    {banner: picture(3000, 1000)},
    {banner: picture(1080, 1920)},
    // An image the editor is still uploading has no asset yet.
    {thumbnail: {_type: 'image', _upload: {progress: 50}}},
  ]) {
    const markers = await studio.validate(series({artwork}))
    assert.deepEqual(
      markers.filter(({path}) => path.startsWith('artwork')),
      [],
      JSON.stringify(artwork),
    )
  }
})

test('artwork alt text holds up to 200 characters, counted as code points', async () => {
  const studio = createHarness({documents: assets([1920, 1080], [3000, 1000])})
  for (const [image, width, height] of [
    ['thumbnail', 1920, 1080],
    ['banner', 3000, 1000],
  ] as const) {
    for (const character of characters) {
      const withAlt = (alt: string) => series({artwork: {[image]: picture(width, height, {alt})}})
      const atLimit = await studio.validate(withAlt(character.repeat(200)))
      assert.deepEqual(errorsAt(atLimit, `artwork.${image}.alt`), [], `${image} 200 × ${character}`)
      const pastLimit = await studio.validate(withAlt(character.repeat(201)))
      assert.equal(
        errorsAt(pastLimit, `artwork.${image}.alt`).length,
        1,
        `${image} 201 × ${character}`,
      )
    }
  }
})

const reference = (_key: string, _ref: string) => ({_key, _type: 'reference', _ref})
// What Studio stores when an editor picks a document that only has a draft.
const weakReference = (_key: string, _ref: string, type: string) => ({
  ...reference(_key, _ref),
  _weak: true,
  _strengthenOnPublish: {type},
})
const mediaItem = (_id: string, series?: string[]): TestDocument => ({
  _id,
  _type: 'mediaItem',
  title: _id,
  ...(series && {series: series.map((_ref, index) => reference(`s${index}`, _ref))}),
})
// The markers on a list field and its items, as [path, level], sorted so rule order doesn't count.
const markersUnder = (markers: Marker[], field: string) =>
  markers
    .filter(({path}) => path === field || path.startsWith(`${field}[`))
    .map(({path, level}) => [path, level])
    .sort((a, b) => a.join().localeCompare(b.join()))

test('each item in a manual order must list the series, and only a draft that lists it is a warning', async () => {
  const studio = createHarness({
    documents: [
      series({ordering: 'manual'}),
      series({_id: 'luke', seriesId: `se_${OTHER_ULID}`, title: 'Luke', slug: slug('luke')}),
      // The published item lists the series.
      mediaItem('listed', ['luke', 'gospel']),
      // Its draft drops the series, but the published item still lists it.
      mediaItem('dropped', ['gospel']),
      mediaItem('drafts.dropped', ['luke']),
      // Only the draft lists it.
      mediaItem('draftOnly', ['luke']),
      mediaItem('drafts.draftOnly', ['luke', 'gospel']),
      // Neither lists it: with a draft, without one, and with no series at all.
      mediaItem('neither', ['luke']),
      mediaItem('drafts.neither', ['luke']),
      mediaItem('other', ['luke']),
      mediaItem('bare'),
    ],
  })
  const manualOrder = ['listed', 'dropped', 'draftOnly', 'neither', 'other', 'bare'].map((_ref) =>
    reference(_ref, _ref),
  )
  for (const _id of ['drafts.gospel', 'versions.rSpring.gospel']) {
    const markers = await studio.validate(series({_id, ordering: 'manual', manualOrder}))
    assert.deepEqual(
      markersUnder(markers, 'manualOrder'),
      [
        ['manualOrder[_key=="bare"]', 'error'],
        ['manualOrder[_key=="draftOnly"]', 'warning'],
        ['manualOrder[_key=="neither"]', 'error'],
        ['manualOrder[_key=="other"]', 'error'],
      ],
      _id,
    )
  }
})

test("an item that was never published can't be in a published manual order yet", async () => {
  const studio = createHarness({
    documents: [mediaItem('drafts.new', ['gospel']), mediaItem('drafts.unsorted', ['luke'])],
  })
  const markers = await studio.validate(
    series({
      _id: 'drafts.gospel',
      ordering: 'manual',
      manualOrder: [
        weakReference('new', 'new', 'mediaItem'),
        weakReference('unsorted', 'unsorted', 'mediaItem'),
      ],
    }),
  )
  // Sanity's own reference check, and this rule's warning or error.
  assert.deepEqual(markersUnder(markers, 'manualOrder'), [
    ['manualOrder[_key=="new"]', 'error'],
    ['manualOrder[_key=="new"]', 'warning'],
    ['manualOrder[_key=="unsorted"]', 'error'],
    ['manualOrder[_key=="unsorted"]', 'error'],
  ])
})

// The field is hidden then, so an editor couldn't see or fix a problem in it.
test('a manual order is checked only while the series uses manual order', async () => {
  const studio = createHarness({documents: [mediaItem('other', ['luke'])]})
  const manualOrder = [reference('a', 'other'), reference('b', 'other')]
  for (const ordering of ['newestFirst', 'oldestFirst']) {
    const markers = await studio.validate(series({_id: 'drafts.gospel', ordering, manualOrder}))
    assert.deepEqual(markersUnder(markers, 'manualOrder'), [], ordering)
  }
  const markers = await studio.validate(
    series({_id: 'drafts.gospel', ordering: 'manual', manualOrder}),
  )
  assert.deepEqual(markersUnder(markers, 'manualOrder'), [
    ['manualOrder[_key=="a"]', 'error'],
    ['manualOrder[_key=="b"]', 'error'],
    ['manualOrder[_key=="b"]', 'error'],
  ])
})

test('a manual order lists each media item once', async () => {
  const studio = createHarness({
    documents: [mediaItem('first', ['gospel']), mediaItem('second', ['gospel'])],
  })
  const markers = await studio.validate(
    series({
      _id: 'drafts.gospel',
      ordering: 'manual',
      manualOrder: [
        reference('a', 'first'),
        reference('b', 'second'),
        reference('c', 'first'),
        // Sanity's unique() would miss this one, because _weak makes the items differ.
        weakReference('d', 'second', 'mediaItem'),
      ],
    }),
  )
  assert.deepEqual(markersUnder(markers, 'manualOrder'), [
    ['manualOrder[_key=="c"]', 'error'],
    ['manualOrder[_key=="d"]', 'error'],
  ])
})

test('the form shows the manual order only when the series uses manual order', async () => {
  const studio = createHarness()
  const manualOrder = [reference('a', 'item')]
  for (const ordering of ['newestFirst', 'oldestFirst', undefined]) {
    assert.deepEqual(studio.hiddenFields(series({ordering, manualOrder})), [
      'manualOrder',
      'source',
    ])
  }
  assert.deepEqual(studio.hiddenFields(series({ordering: 'manual'})), ['source'])
  // The import source shows once the importer has set it.
  assert.deepEqual(studio.hiddenFields(series({ordering: 'manual', source})), [])
})
