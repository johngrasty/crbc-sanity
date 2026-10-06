import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type TestDocument} from './harness.ts'

// An event that starts at a UTC instant, with a length in minutes.
const event = (_id: string, utc: string | undefined, fields: Record<string, unknown> = {}) => ({
  _id,
  _type: 'serviceEvent',
  scheduledStart: {timeZone: 'America/New_York', ...(utc ? {utc} : {})},
  expectedDurationMinutes: 80,
  cancelled: false,
  ...fields,
})

const documents: TestDocument[] = [
  event('lastSunday', '2026-10-04T13:00:00Z'),
  event('lastWednesday', '2026-10-07T22:30:00Z', {expectedDurationMinutes: 50}),
  // Started at 13:00 and runs until 14:20.
  event('thisSunday', '2026-10-11T13:00:00Z'),
  // Ended at 13:20, ten minutes before now.
  event('earlyService', '2026-10-11T12:00:00Z'),
  event('wednesday', '2026-10-14T22:30:00Z', {expectedDurationMinutes: 50}),
  event('nextSunday', '2026-10-18T13:00:00Z'),
  // Published for last week, with a draft that moves it to next week.
  event('moved', '2026-10-04T15:00:00Z'),
  event('drafts.moved', '2026-10-21T22:30:00Z'),
  // A draft whose start the clocks skip has no instant yet.
  event('drafts.noStart', undefined),
  event('cancelledSunday', '2026-10-25T13:00:00Z', {cancelled: true}),
  event('cancelledLastMonth', '2026-09-27T13:00:00Z', {cancelled: true}),
  event('versions.rSpring.inRelease', '2026-10-12T13:00:00Z'),
  {_id: 'item', _type: 'mediaItem', title: 'Not an event'},
]

// What a list shows, by published _id.
async function listed(id: string) {
  // Sunday, October 11, 2026 at 9:30 in New York, during the service.
  const studio = createHarness({documents, now: '2026-10-11T13:30:00Z'})
  const pane = await studio.desk('media', 'serviceEvents', id)
  return {title: pane.title, ids: pane.documents?.map(({_id}) => _id.replace(/^drafts\./, ''))}
}

test('the Media section lists service events as upcoming, past and cancelled', async () => {
  const studio = createHarness()
  const pane = await studio.desk('media', 'serviceEvents')
  assert.equal(pane.title, 'Service events')
  assert.deepEqual(pane.items, [
    {id: 'upcomingEvents', title: 'Upcoming'},
    {id: 'pastEvents', title: 'Past'},
    {id: 'cancelledEvents', title: 'Cancelled'},
  ])
})

test('upcoming events run soonest first, from one still running to one with no start yet', async () => {
  assert.deepEqual(await listed('upcomingEvents'), {
    title: 'Upcoming services',
    ids: ['thisSunday', 'wednesday', 'nextSunday', 'moved', 'noStart'],
  })
})

test('past events run newest first', async () => {
  assert.deepEqual(await listed('pastEvents'), {
    title: 'Past services',
    ids: ['earlyService', 'lastWednesday', 'lastSunday'],
  })
})

test('cancelled events are listed apart, newest first', async () => {
  assert.deepEqual(await listed('cancelledEvents'), {
    title: 'Cancelled services',
    ids: ['cancelledSunday', 'cancelledLastMonth'],
  })
})
