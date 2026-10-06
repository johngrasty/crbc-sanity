import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker, type TestDocument} from './harness.ts'

const EVENT_ID = /^ev_[0-9A-HJKMNP-TV-Z]{26}$/

// A media item that publishes without errors.
const ITEM: TestDocument = {
  _id: 'item',
  _type: 'mediaItem',
  contentId: 'mi_01K6Z8Y4N3QJ5W2X7R9T0V1B2C',
  kind: 'service',
  serviceTimezone: 'America/New_York',
  publicationPolicy: 'auto',
}

const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)

test('a new service event gets an event ID and the church defaults', async () => {
  const studio = createHarness()
  const first = await studio.create('serviceEvent')
  const second = await studio.create('serviceEvent')
  assert.match(String(first.eventId), EVENT_ID)
  assert.notEqual(first.eventId, second.eventId)
  assert.deepEqual(first.scheduledStart, {timeZone: 'America/New_York'})
  assert.equal(first.resourceId, 'lr_main')
  assert.equal(first.socialGoLiveLeadMinutes, 5)
  assert.equal(first.cancelled, false)
  assert.equal(first.expectedDurationMinutes, undefined)
  assert.equal(first.mediaItem, undefined)
})

test('a missing or malformed event ID is an error', async () => {
  const studio = createHarness()
  const event = await studio.create('serviceEvent')
  for (const eventId of [undefined, `mi_${String(event.eventId).slice(3)}`]) {
    const markers = await studio.validate({...event, eventId})
    assert.equal(errorsAt(markers, 'eventId').length, 1, `${eventId}`)
  }
})

test('the media item is required', async () => {
  const studio = createHarness()
  const event = await studio.create('serviceEvent')
  assert.equal(errorsAt(await studio.validate(event), 'mediaItem').length, 1)
})

test('an event can be drafted against a draft-only item, but publishes only after the item', async () => {
  const studio = createHarness({documents: [{...ITEM, _id: 'drafts.item'}]})
  const created = await studio.create('serviceEvent')
  const id = created._id.replace(/^drafts\./, '')
  // Picking a draft-only item in Studio stores a weak reference that publishing strengthens.
  await studio.edit(id, {
    set: {
      mediaItem: {
        _type: 'reference',
        _ref: 'item',
        _weak: true,
        _strengthenOnPublish: {type: 'mediaItem'},
      },
    },
  })
  const markers = errorsAt(await studio.validate(`drafts.${id}`), 'mediaItem')
  assert.deepEqual(
    markers.map(({message}) => message),
    ['Referenced document must be published'],
  )
  await assert.rejects(studio.publish(id), /mediaItem: Referenced document must be published/)

  await studio.publish('item')
  assert.deepEqual(errorsAt(await studio.validate(`drafts.${id}`), 'mediaItem'), [])
})

test('the expected length is required, in whole minutes from 10 to 300', async () => {
  const studio = createHarness()
  const event = await studio.create('serviceEvent')
  for (const expectedDurationMinutes of [10, 80, 300]) {
    const markers = await studio.validate({...event, expectedDurationMinutes})
    assert.deepEqual(errorsAt(markers, 'expectedDurationMinutes'), [], `${expectedDurationMinutes}`)
  }
  for (const expectedDurationMinutes of [undefined, 9, 301, 80.5]) {
    const markers = await studio.validate({...event, expectedDurationMinutes})
    assert.notDeepEqual(
      errorsAt(markers, 'expectedDurationMinutes'),
      [],
      `${expectedDurationMinutes}`,
    )
  }
})

test("the live stream must be a resource ID in the contract's format", async () => {
  const studio = createHarness()
  const event = await studio.create('serviceEvent')
  for (const resourceId of ['lr_main', 'lr_spare_2']) {
    assert.deepEqual(errorsAt(await studio.validate({...event, resourceId}), 'resourceId'), [])
  }
  for (const resourceId of [undefined, '', 'main', 'lr_', 'lr_Main', `lr_${'a'.repeat(41)}`]) {
    const markers = await studio.validate({...event, resourceId})
    assert.equal(errorsAt(markers, 'resourceId').length, 1, `${resourceId}`)
  }
})

test('the go-live lead is optional, in whole minutes from 0 to 60', async () => {
  const studio = createHarness()
  const event = await studio.create('serviceEvent')
  // media-ops reads a missing lead as 5.
  for (const socialGoLiveLeadMinutes of [undefined, 0, 5, 60]) {
    const markers = await studio.validate({...event, socialGoLiveLeadMinutes})
    assert.deepEqual(errorsAt(markers, 'socialGoLiveLeadMinutes'), [], `${socialGoLiveLeadMinutes}`)
  }
  for (const socialGoLiveLeadMinutes of [-1, 61, 2.5]) {
    const markers = await studio.validate({...event, socialGoLiveLeadMinutes})
    assert.notDeepEqual(
      errorsAt(markers, 'socialGoLiveLeadMinutes'),
      [],
      `${socialGoLiveLeadMinutes}`,
    )
  }
})

const destination = (_key: string, fields: Record<string, unknown>) => ({
  _key,
  _type: 'requestedDestination',
  platform: 'youtube',
  accountLabel: 'CRBC YouTube',
  visibility: 'public',
  ...fields,
})

test('a destination an editor adds starts as public', async () => {
  const studio = createHarness()
  const added = await studio.newArrayItem('serviceEvent', 'requestedDestinations')
  assert.equal(added._type, 'requestedDestination')
  assert.match(String(added._key), /^\w+$/)
  assert.equal(added.visibility, 'public')
})

test('a destination has a platform, an account label and a visibility', async () => {
  const studio = createHarness()
  const event = await studio.create('serviceEvent')
  const errorsFor = async (fields: Record<string, unknown>, field: string) => {
    const requestedDestinations = [destination('a', fields)]
    const markers = await studio.validate({...event, requestedDestinations})
    return errorsAt(markers, `requestedDestinations[_key=="a"].${field}`)
  }
  for (const platform of ['youtube', 'facebook']) {
    assert.deepEqual(await errorsFor({platform}, 'platform'), [], platform)
  }
  for (const platform of [undefined, 'YouTube', 'twitch']) {
    assert.notDeepEqual(await errorsFor({platform}, 'platform'), [], `${platform}`)
  }
  for (const visibility of ['public', 'unlisted', 'private']) {
    assert.deepEqual(await errorsFor({visibility}, 'visibility'), [], visibility)
  }
  for (const visibility of [undefined, 'hidden']) {
    assert.notDeepEqual(await errorsFor({visibility}, 'visibility'), [], `${visibility}`)
  }
  for (const accountLabel of [undefined, '']) {
    assert.equal((await errorsFor({accountLabel}, 'accountLabel')).length, 1, `${accountLabel}`)
  }
  // é is one UTF-16 unit and two UTF-8 bytes. 😀 is two UTF-16 units and one code point, which
  // is how the contract's JSON Schema counts a character.
  for (const character of ['é', '😀']) {
    const atLimit = await errorsFor({accountLabel: character.repeat(200)}, 'accountLabel')
    assert.deepEqual(atLimit, [], `200 × ${character}`)
    const pastLimit = await errorsFor({accountLabel: character.repeat(201)}, 'accountLabel')
    assert.equal(pastLimit.length, 1, `201 × ${character}`)
  }
})

test('the same platform and account label twice is an error', async () => {
  const studio = createHarness()
  const event = await studio.create('serviceEvent')
  const requestedDestinations = [
    destination('a', {platform: 'youtube', accountLabel: 'CRBC'}),
    destination('b', {platform: 'facebook', accountLabel: 'CRBC'}),
    destination('c', {platform: 'youtube', accountLabel: 'CRBC Rehearsals'}),
    destination('d', {platform: 'youtube', accountLabel: 'CRBC', visibility: 'unlisted'}),
  ]
  const destinationErrors = async (list: unknown[]) =>
    (await studio.validate({...event, requestedDestinations: list}))
      .filter(({level, path}) => level === 'error' && path.startsWith('requestedDestinations'))
      .map(({path}) => path)
  assert.deepEqual(await destinationErrors(requestedDestinations), [
    'requestedDestinations[_key=="d"]',
  ])
  assert.deepEqual(await destinationErrors(requestedDestinations.slice(0, 3)), [])
})

const warningsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'warning' && marker.path === path)

// A valid event on the main live stream: October 11, 2026 from 9:00 to 10:20 in New York, which
// is 13:00 to 14:20 UTC.
const event = (_id: string, fields: Record<string, unknown> = {}): TestDocument => ({
  _id,
  _type: 'serviceEvent',
  eventId: 'ev_01K6Z8Y4N3QJ5W2X7R9T0V1B2C',
  mediaItem: {_type: 'reference', _ref: 'item'},
  scheduledStart: {
    local: '2026-10-11T09:00',
    timeZone: 'America/New_York',
    offset: '-04:00',
    utc: '2026-10-11T13:00:00Z',
  },
  expectedDurationMinutes: 80,
  resourceId: 'lr_main',
  cancelled: false,
  ...fields,
})

// The same service time on other days, so only the media item is shared.
const nextWeek = {
  eventId: 'ev_01K6Z9A7H2MXW4Q8C5R3T6V0BD',
  scheduledStart: {
    local: '2026-10-18T09:00',
    timeZone: 'America/New_York',
    offset: '-04:00',
    utc: '2026-10-18T13:00:00Z',
  },
}

test('another event that uses the same item is a warning, unless it is cancelled', async () => {
  const sharedItemWarnings = async (...others: TestDocument[]) => {
    const studio = createHarness({documents: [ITEM, ...others]})
    return warningsAt(await studio.validate(event('drafts.this')), 'mediaItem').length
  }
  assert.equal(await sharedItemWarnings(event('other', nextWeek)), 1)
  assert.equal(await sharedItemWarnings(event('drafts.other', nextWeek)), 1)
  assert.equal(await sharedItemWarnings(event('versions.rSpring.other', nextWeek)), 1)
  assert.equal(await sharedItemWarnings(event('other', {...nextWeek, cancelled: true})), 0)
  const otherItem = {mediaItem: {_type: 'reference', _ref: 'item2'}}
  assert.equal(await sharedItemWarnings(event('other', {...nextWeek, ...otherItem})), 0)
  // The event's own published and release versions don't count.
  assert.equal(await sharedItemWarnings(event('this'), event('versions.rSpring.this')), 0)
})

test('another event on the same live stream that overlaps is a warning, unless it is cancelled', async () => {
  // Another event on October 11, 2026, with its New York and UTC start times, both HH:mm.
  const other = (local: string, utc: string, expectedDurationMinutes: number) => ({
    eventId: 'ev_01K6Z9A7H2MXW4Q8C5R3T6V0BD',
    mediaItem: {_type: 'reference', _ref: 'item2'},
    scheduledStart: {
      local: `2026-10-11T${local}`,
      timeZone: 'America/New_York',
      offset: '-04:00',
      utc: `2026-10-11T${utc}:00Z`,
    },
    expectedDurationMinutes,
  })
  const overlapWarnings = async (fields: Record<string, unknown>, own = {}) => {
    const studio = createHarness({documents: [ITEM, event('other', fields)]})
    return warningsAt(await studio.validate(event('drafts.this', own)), 'scheduledStart').length
  }
  // This event runs from 9:00 to 10:20 in New York, 13:00 to 14:20 UTC.
  assert.equal(await overlapWarnings(other('09:00', '13:00', 80)), 1)
  assert.equal(await overlapWarnings(other('10:19', '14:19', 60)), 1)
  assert.equal(await overlapWarnings(other('08:00', '12:00', 61)), 1)
  assert.equal(await overlapWarnings(other('08:00', '12:00', 180)), 1)
  assert.equal(await overlapWarnings(other('10:20', '14:20', 60)), 0)
  assert.equal(await overlapWarnings(other('08:00', '12:00', 60)), 0)
  const spare = {...other('09:30', '13:30', 60), resourceId: 'lr_spare'}
  assert.equal(await overlapWarnings(spare), 0)
  assert.equal(await overlapWarnings({...other('09:30', '13:30', 60), cancelled: true}), 0)
  // A longer service runs into the next one.
  assert.equal(await overlapWarnings(other('10:30', '14:30', 60)), 0)
  assert.equal(
    await overlapWarnings(other('10:30', '14:30', 60), {expectedDurationMinutes: 100}),
    1,
  )
})

test('a cancelled event gets neither warning', async () => {
  const studio = createHarness({documents: [ITEM, event('other')]})
  const markers = await studio.validate(event('drafts.this', {cancelled: true}))
  assert.deepEqual(
    markers.filter(({level}) => level === 'warning'),
    [],
  )
})
