import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker} from './harness.ts'

// The markers under scheduledStart, as [path, message] pairs, errors only.
const startErrors = (markers: Marker[]) =>
  markers
    .filter(({level, path}) => level === 'error' && path.startsWith('scheduledStart'))
    .map(({path, message}) => [path, message])

async function startErrorsFor(scheduledStart: Record<string, unknown> | undefined) {
  const studio = createHarness()
  const event = await studio.create('serviceEvent')
  return startErrors(await studio.validate({...event, scheduledStart}))
}

const pathsOf = (errors: string[][]) => errors.map(([path]) => path)

test('a normal start is valid', async () => {
  // October 11, 2026, 9:00 in New York is during daylight saving time, UTC-4.
  const start = {
    local: '2026-10-11T09:00',
    timeZone: 'America/New_York',
    offset: '-04:00',
    utc: '2026-10-11T13:00:00Z',
  }
  assert.deepEqual(await startErrorsFor(start), [])
  // India has no daylight saving time and a half-hour offset.
  const kolkata = {
    local: '2026-10-11T09:00',
    timeZone: 'Asia/Kolkata',
    offset: '+05:30',
    utc: '2026-10-11T03:30:00Z',
  }
  assert.deepEqual(await startErrorsFor(kolkata), [])
})

test('a missing start is an error', async () => {
  assert.deepEqual(pathsOf(await startErrorsFor(undefined)), ['scheduledStart'])
  assert.deepEqual(pathsOf(await startErrorsFor({timeZone: 'America/New_York'})), [
    'scheduledStart.local',
  ])
})

test('a malformed local time is an error', async () => {
  for (const local of [
    '2026-10-11 09:00',
    '2026-10-11T9:00',
    '2026-10-11T09:00:00',
    '2026-10-11T09:00Z',
    '2026-02-29T09:00',
    '2026-10-11T24:00',
    '2026-10-11T09:60',
    'next Sunday',
  ]) {
    const errors = await startErrorsFor({local, timeZone: 'America/New_York'})
    assert.deepEqual(pathsOf(errors), ['scheduledStart.local'], local)
  }
})

test('an unknown or missing time zone is an error', async () => {
  for (const timeZone of [undefined, 'Mars/Olympus', 'EST', '+05:00', 'america/new_york']) {
    const errors = await startErrorsFor({local: '2026-10-11T09:00', timeZone})
    assert.deepEqual(pathsOf(errors), ['scheduledStart.timeZone'], `${timeZone}`)
  }
})

test('a time the clocks skip is an error, whatever offset is stored', async () => {
  // At 2:00 on March 14, 2027, New York's clocks jump to 3:00, so 2:30 never happens.
  const local = '2027-03-14T02:30'
  const timeZone = 'America/New_York'
  for (const instant of [
    {},
    {offset: '-05:00', utc: '2027-03-14T07:30:00Z'},
    {offset: '-04:00', utc: '2027-03-14T06:30:00Z'},
  ]) {
    const errors = await startErrorsFor({local, timeZone, ...instant})
    assert.deepEqual(pathsOf(errors), ['scheduledStart.local'], JSON.stringify(instant))
    assert.match(errors[0][1], /skip/)
  }
})

test('a time that happens twice needs one of its two offsets', async () => {
  // At 2:00 on November 1, 2026, New York's clocks go back to 1:00, so 1:30 happens twice.
  const local = '2026-11-01T01:30'
  const timeZone = 'America/New_York'
  const missing = await startErrorsFor({local, timeZone})
  assert.deepEqual(pathsOf(missing), ['scheduledStart.offset'])
  assert.match(missing[0][1], /twice/)

  const first = {local, timeZone, offset: '-04:00', utc: '2026-11-01T05:30:00Z'}
  assert.deepEqual(await startErrorsFor(first), [])
  const second = {local, timeZone, offset: '-05:00', utc: '2026-11-01T06:30:00Z'}
  assert.deepEqual(await startErrorsFor(second), [])
})

test('an offset not in effect at the local time is an error', async () => {
  const timeZone = 'America/New_York'
  for (const start of [
    {local: '2026-10-11T09:00', offset: '-05:00', utc: '2026-10-11T14:00:00Z'},
    {local: '2026-10-11T09:00', utc: '2026-10-11T13:00:00Z'},
    {local: '2026-11-01T01:30', offset: '-06:00', utc: '2026-11-01T07:30:00Z'},
    {local: '2026-12-20T09:00', offset: '-04:00', utc: '2026-12-20T13:00:00Z'},
  ]) {
    const errors = await startErrorsFor({...start, timeZone})
    assert.deepEqual(pathsOf(errors), ['scheduledStart.offset'], JSON.stringify(start))
  }
})

test('a UTC time that is not the local time minus the offset is an error', async () => {
  const start = {local: '2026-10-11T09:00', timeZone: 'America/New_York', offset: '-04:00'}
  for (const utc of [
    undefined,
    '2026-10-11T14:00:00Z',
    '2026-10-11T09:00:00Z',
    '2026-10-11T13:00Z',
    '2026-10-11T13:00:00.000Z',
  ]) {
    const errors = await startErrorsFor({...start, utc})
    assert.deepEqual(pathsOf(errors), ['scheduledStart.utc'], `${utc}`)
  }
})
