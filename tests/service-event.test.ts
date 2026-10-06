import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker} from './harness.ts'

const EVENT_ID = /^ev_[0-9A-HJKMNP-TV-Z]{26}$/

// A media item that publishes without errors.
const ITEM = {
  _id: 'item',
  _type: 'mediaItem',
  contentId: 'mi_01K6Z8Y4N3QJ5W2X7R9T0V1B2C',
  kind: 'service',
  serviceTimezone: 'America/New_York',
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
