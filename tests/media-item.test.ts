import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker} from './harness.ts'

// Contract section 2: mi_ and a ULID, 26 characters of Crockford base32.
const CONTENT_ID = /^mi_[0-9A-HJKMNP-TV-Z]{26}$/

// The first 10 ULID characters are the creation time in milliseconds, in Crockford base32.
const ulidTime = (id: string) =>
  [...id.slice(3, 13)].reduce((time, char) => time * 32 + crockford.indexOf(char), 0)
const crockford = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

const ULID = '01K6Z8Y4N3QJ5W2X7R9T0V1B2C'
const OTHER_ULID = '01K6Z9A7H2MXW4Q8C5R3T6V0BD'
const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)
const errors = (markers: Marker[]) => markers.filter((marker) => marker.level === 'error')
const warningsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'warning' && marker.path === path)

test('a new media item gets a well-formed content ID, and two new items differ', async () => {
  const studio = createHarness()
  const first = await studio.create('mediaItem')
  const second = await studio.create('mediaItem')
  assert.match(String(first.contentId), CONTENT_ID)
  assert.match(String(second.contentId), CONTENT_ID)
  assert.notEqual(first.contentId, second.contentId)
})

test('a content ID starts with the moment the item was created', async () => {
  const studio = createHarness()
  const before = Date.now()
  const item = await studio.create('mediaItem')
  const after = Date.now()
  const time = ulidTime(String(item.contentId))
  assert.ok(time >= before && time <= after, `${time} is not between ${before} and ${after}`)
})

test('a missing or malformed content ID is an error', async () => {
  const studio = createHarness()
  const item = (contentId?: string) => ({_id: 'item', _type: 'mediaItem', contentId})
  for (const contentId of [
    undefined,
    '',
    `mi_${ULID.slice(1)}`,
    `mi_${ULID}0`,
    `mi_${ULID.toLowerCase()}`,
    `mi_${ULID.slice(1)}U`,
    `se_${ULID}`,
    ULID,
  ]) {
    const markers = await studio.validate(item(contentId))
    assert.equal(errorsAt(markers, 'contentId').length, 1, `${contentId} should be one error`)
  }
  assert.deepEqual(errorsAt(await studio.validate(item(`mi_${ULID}`)), 'contentId'), [])
})

test('a content ID another media item uses is an error, in any of its versions', async () => {
  const contentId = `mi_${ULID}`
  for (const other of ['other', 'drafts.other', 'versions.rSpring.other']) {
    const studio = createHarness({documents: [{_id: other, _type: 'mediaItem', contentId}]})
    const markers = await studio.validate({_id: 'drafts.item', _type: 'mediaItem', contentId})
    assert.equal(errorsAt(markers, 'contentId').length, 1, `taken by ${other}`)
  }
})

test("an item's published, draft and release versions may share its content ID", async () => {
  const contentId = `mi_${ULID}`
  const versions = ['item', 'drafts.item', 'versions.rSpring.item'].map((_id) => ({
    _id,
    _type: 'mediaItem',
    contentId,
  }))
  // The mirror media-ops writes for this item carries the same content ID.
  const mirror = {_id: `mediaRelease.dev.${contentId}`, _type: 'mediaRelease', contentId}
  const studio = createHarness({documents: [...versions, mirror]})
  for (const {_id} of versions) {
    assert.deepEqual(errorsAt(await studio.validate(_id), 'contentId'), [], _id)
  }
})

test('a draft or release version whose content ID differs from the published item is an error', async () => {
  const published = {_id: 'item', _type: 'mediaItem', contentId: `mi_${ULID}`}
  const studio = createHarness({documents: [published]})
  const pasted = {set: {contentId: `mi_${OTHER_ULID}`}}
  const draft = await studio.edit('item', pasted)
  const version = await studio.edit('item', pasted, {release: 'rSpring'})
  assert.equal(draft._id, 'drafts.item')
  assert.equal(version._id, 'versions.rSpring.item')
  for (const {_id} of [draft, version]) {
    assert.equal(errorsAt(await studio.validate(_id), 'contentId').length, 1, _id)
  }
})

test('an item written without a content ID can get one in a draft', async () => {
  const studio = createHarness({documents: [{_id: 'item', _type: 'mediaItem'}]})
  const draft = await studio.edit('item', {set: {contentId: `mi_${ULID}`}})
  assert.deepEqual(errorsAt(await studio.validate(draft._id), 'contentId'), [])
})

test('a new media item starts as a full service in the church time zone', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  assert.equal(item.kind, 'service')
  assert.equal(item.serviceTimezone, 'America/New_York')
})

test('kind is required and is one of the four kinds', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  for (const kind of ['service', 'sermon', 'audio', 'other']) {
    assert.deepEqual(errorsAt(await studio.validate({...item, kind}), 'kind'), [], kind)
  }
  for (const kind of [undefined, '', 'video', 'Service']) {
    assert.notDeepEqual(errorsAt(await studio.validate({...item, kind}), 'kind'), [], `${kind}`)
  }
})

test('the time zone is required and must be a canonical zone name Intl knows', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  for (const serviceTimezone of ['America/New_York', 'America/Chicago', 'Europe/London', 'UTC']) {
    const markers = await studio.validate({...item, serviceTimezone})
    assert.deepEqual(errorsAt(markers, 'serviceTimezone'), [], serviceTimezone)
  }
  // Intl accepts the last four, as an offset, another spelling or aliases. EST is America/Panama.
  const invalid = [undefined, '', 'Mars/Olympus', '-04:00', 'america/new_york', 'US/Eastern', 'EST']
  for (const serviceTimezone of invalid) {
    const markers = await studio.validate({...item, serviceTimezone})
    assert.notDeepEqual(errorsAt(markers, 'serviceTimezone'), [], `${serviceTimezone}`)
  }
})

test('a title holds up to 200 characters, counted as Unicode code points', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  // é is one UTF-16 unit and two UTF-8 bytes. 😀 is outside the BMP: two UTF-16 units, one
  // code point, which is how the contract's JSON Schema counts a character.
  for (const character of ['é', '😀']) {
    const atLimit = await studio.validate({...item, title: character.repeat(200)})
    assert.deepEqual(errorsAt(atLimit, 'title'), [], `200 × ${character}`)
    const pastLimit = await studio.validate({...item, title: character.repeat(201)})
    assert.equal(errorsAt(pastLimit, 'title').length, 1, `201 × ${character}`)
  }
})

test('a placeholder item with no title or service date has warnings, not errors', async () => {
  const studio = createHarness()
  const markers = await studio.validate(await studio.create('mediaItem'))
  assert.deepEqual(errors(markers), [])
  assert.equal(warningsAt(markers, 'title').length, 1)
  assert.equal(warningsAt(markers, 'serviceDate').length, 1)
})

test('a service date is a calendar date, not an instant', async () => {
  const studio = createHarness()
  const item = await studio.create('mediaItem')
  assert.deepEqual(
    errorsAt(await studio.validate({...item, serviceDate: '2026-10-04'}), 'serviceDate'),
    [],
  )
  for (const serviceDate of ['10/04/2026', '2026-10-04T13:00:00Z', '2026-13-01']) {
    const markers = await studio.validate({...item, serviceDate})
    assert.notDeepEqual(errorsAt(markers, 'serviceDate'), [], serviceDate)
  }
})

test('publishing keeps the content ID, and later versions share it', async () => {
  const studio = createHarness()
  const created = await studio.create('mediaItem')
  const id = created._id.replace(/^drafts\./, '')
  const published = await studio.publish(id)
  assert.equal(published._id, id)
  assert.equal(published.contentId, created.contentId)

  await studio.edit(id, {set: {title: 'Draft title'}})
  await studio.edit(id, {set: {title: 'Spring title'}}, {release: 'rSpring'})
  for (const version of [id, `drafts.${id}`, `versions.rSpring.${id}`]) {
    assert.deepEqual(errorsAt(await studio.validate(version), 'contentId'), [], version)
  }

  await studio.publish(id, {release: 'rSpring'})
  const documents = studio.documents()
  assert.deepEqual(documents.map(({_id}) => _id).sort(), [`drafts.${id}`, id].sort())
  assert.equal(documents.find(({_id}) => _id === id)?.title, 'Spring title')
})

test('a version with errors does not publish', async () => {
  const draft = {_id: 'drafts.item', _type: 'mediaItem', kind: 'service'}
  const studio = createHarness({documents: [{...draft, serviceTimezone: 'America/New_York'}]})
  await assert.rejects(studio.publish('item'), /contentId/)
  assert.deepEqual(
    studio.documents().map(({_id}) => _id),
    ['drafts.item'],
  )
})

test('the Media section lists media items, newest service date first', async () => {
  const item = (_id: string, title: string, serviceDate: string) => ({
    _id,
    _type: 'mediaItem',
    title,
    serviceDate,
  })
  const studio = createHarness({
    documents: [
      item('a', 'September 27', '2026-09-27'),
      item('b', 'Published October 4', '2026-09-20'),
      item('drafts.b', 'Draft moved to October 11', '2026-10-11'),
      item('drafts.c', 'Draft-only October 4', '2026-10-04'),
      item('versions.rSpring.d', 'Only in a release', '2026-12-25'),
      {_id: 'news', _type: 'article', title: 'Not a media item'},
    ],
  })
  const {title, documents} = await studio.desk('media', 'mediaItems')
  assert.equal(title, 'Media items')
  assert.deepEqual(
    documents?.map((document) => document.title),
    ['Draft moved to October 11', 'Draft-only October 4', 'September 27'],
  )
})
