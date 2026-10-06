import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker} from './harness.ts'

const EVENT_ID = /^ev_[0-9A-HJKMNP-TV-Z]{26}$/

const startErrors = (markers: Marker[]) =>
  markers.filter(({level, path}) => level === 'error' && path.startsWith('scheduledStart'))

test('each standing slot has a service event template named by its label', () => {
  const studio = createHarness()
  assert.deepEqual(studio.templates('serviceEvent'), [
    {id: 'serviceEvent', title: 'Service event'},
    {id: 'serviceEvent-sunday-morning', title: 'Sunday morning'},
    {id: 'serviceEvent-wednesday-night', title: 'Wednesday night'},
  ])
  const menu = studio.createMenu()
  for (const id of [
    'serviceEvent',
    'serviceEvent-sunday-morning',
    'serviceEvent-wednesday-night',
  ]) {
    assert.ok(menu.includes(id), id)
  }
})

// Creates each slot's event at the moment now, and checks its start and length. expected maps a
// slot to its local start, offset, UTC start and length.
async function expectStarts(
  now: string,
  expected: Record<string, [string, string, string, number]>,
) {
  for (const [slot, [local, offset, utc, minutes]] of Object.entries(expected)) {
    const studio = createHarness({now})
    const event = await studio.create(`serviceEvent-${slot}`)
    const label = `${slot} created at ${now}`
    assert.deepEqual(
      event.scheduledStart,
      {local, timeZone: 'America/New_York', offset, utc},
      label,
    )
    assert.equal(event.expectedDurationMinutes, minutes, label)
    assert.deepEqual(startErrors(await studio.validate(event)), [], label)
  }
}

test("a slot template starts at the slot's next occurrence, with the slot's length", async () => {
  // Wednesday, July 15, 2026 at noon in New York, during daylight saving time.
  await expectStarts('2026-07-15T16:00:00Z', {
    'sunday-morning': ['2026-07-19T09:00', '-04:00', '2026-07-19T13:00:00Z', 80],
    'wednesday-night': ['2026-07-15T18:30', '-04:00', '2026-07-15T22:30:00Z', 50],
  })
  // Wednesday, December 16, 2026 at 8:00 PM in New York, after that night's service. It's
  // already Thursday in UTC.
  await expectStarts('2026-12-17T01:00:00Z', {
    'sunday-morning': ['2026-12-20T09:00', '-05:00', '2026-12-20T14:00:00Z', 80],
    'wednesday-night': ['2026-12-23T18:30', '-05:00', '2026-12-23T23:30:00Z', 50],
  })
  // A second before a service starts, the template picks it. At the start, it's next week's.
  await expectStarts('2026-07-19T12:59:59Z', {
    'sunday-morning': ['2026-07-19T09:00', '-04:00', '2026-07-19T13:00:00Z', 80],
  })
  await expectStarts('2026-07-19T13:00:00Z', {
    'sunday-morning': ['2026-07-26T09:00', '-04:00', '2026-07-26T13:00:00Z', 80],
  })
})

test('a slot template sets the same defaults as the plain template', async () => {
  const studio = createHarness({now: '2026-07-15T16:00:00Z'})
  const first = await studio.create('serviceEvent-sunday-morning')
  const second = await studio.create('serviceEvent-sunday-morning')
  assert.match(String(first.eventId), EVENT_ID)
  assert.notEqual(first.eventId, second.eventId)
  assert.equal(first.resourceId, 'lr_main')
  assert.equal(first.socialGoLiveLeadMinutes, 5)
  assert.equal(first.cancelled, false)
})
