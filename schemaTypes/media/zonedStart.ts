// A service event's start: the wall-clock time an editor enters, its IANA zone, the UTC offset
// in effect at that time, and the instant media-ops arms the service by.
import {isTimeZone, timeZoneMessage} from './timeZone'

export type ZonedStart = {local?: string; timeZone?: string; offset?: string; utc?: string}

// One reading of a wall time. offset is ±HH:MM and utc is YYYY-MM-DDTHH:mm:ssZ.
export type ZonedInstant = {offset: string; utc: string}

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE
const LOCAL_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

// The wall time YYYY-MM-DDTHH:mm as milliseconds, read as if it were UTC, or null when it
// isn't a real date and time.
function wallClock(local: string): number | null {
  const match = LOCAL_TIME.exec(local)
  if (!match) return null
  const [year, month, day, hour, minute] = match.slice(1).map(Number)
  if (hour > 23 || minute > 59) return null
  // setUTCFullYear takes the year as written, where Date.UTC reads 0 to 99 as 1900 to 1999.
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.getTime() + (hour * 60 + minute) * MINUTE
}

export const isLocalTime = (local: string): boolean => wallClock(local) !== null

const offsetFormats = new Map<string, Intl.DateTimeFormat>()

// The offset in minutes that the zone uses at an instant. Intl names it GMT, GMT-04:00 or
// GMT+05:30. Local mean time, before a zone adopted standard time, has seconds, such as
// GMT-04:56:02, and can't be stored as ±HH:MM, so it gives null.
function offsetAt(instant: number, timeZone: string): number | null {
  let format = offsetFormats.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {timeZone, timeZoneName: 'longOffset'})
    offsetFormats.set(timeZone, format)
  }
  const name = format.formatToParts(instant).find(({type}) => type === 'timeZoneName')?.value
  if (name === 'GMT') return 0
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(name ?? '')
  if (!match) return null
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]))
}

const formatOffset = (minutes: number) => {
  const sign = minutes < 0 ? '-' : '+'
  const hours = String(Math.floor(Math.abs(minutes) / 60)).padStart(2, '0')
  return `${sign}${hours}:${String(Math.abs(minutes) % 60).padStart(2, '0')}`
}

const formatUtc = (instant: number) => new Date(instant).toISOString().replace(/\.\d{3}Z$/, 'Z')

// Every instant at which the zone's clocks show the wall time local: one on a normal day, none
// in a gap when the clocks skip ahead, and two, earlier first, in an overlap when they go back.
// local is YYYY-MM-DDTHH:mm and timeZone must pass isTimeZone.
export function resolveWallTime(local: string, timeZone: string): ZonedInstant[] {
  const wall = wallClock(local)
  if (wall === null) throw new RangeError(`${local} is not a YYYY-MM-DDTHH:mm time`)
  if (!isTimeZone(timeZone)) throw new RangeError(`${timeZone} is not a time zone`)
  // A zone changes its offset at most once within a day of any wall time, so the offsets in
  // effect a day either side are the only candidates. Each candidate is kept when the zone
  // really uses it at the instant it gives.
  const candidates = new Set([wall - DAY, wall, wall + DAY].map((at) => offsetAt(at, timeZone)))
  const instants: {at: number; offset: number}[] = []
  for (const offset of candidates) {
    if (offset === null) continue
    const at = wall - offset * MINUTE
    if (offsetAt(at, timeZone) === offset) instants.push({at, offset})
  }
  return instants
    .sort((a, b) => a.at - b.at)
    .map(({at, offset}) => ({offset: formatOffset(offset), utc: formatUtc(at)}))
}

export type StartField = keyof ZonedStart

export const startMessages = {
  missing: 'Enter the date and time the service starts.',
  malformed: 'Enter the start as a date and a time, such as 2026-10-11T09:00.',
  zoneMissing: 'Enter the time zone, such as America/New_York.',
  zoneUnknown: timeZoneMessage,
  skipped: (timeZone: string) =>
    `The clocks skip this time in ${timeZone} when they change. Pick another time.`,
  twice: (timeZone: string) =>
    `This time happens twice in ${timeZone} when the clocks go back. Choose which one you mean.`,
  offsetMissing: 'The UTC offset for this start is missing. Enter the time again.',
  offsetWrong: (offset: string, timeZone: string) =>
    `${timeZone} isn't at UTC${offset} at this time. Enter the time again.`,
  utcMissing: 'The UTC time for this start is missing. Enter the time again.',
  utcWrong: "The UTC time doesn't match this start. Enter the time again.",
}

// What's wrong with a stored start, by field. Local time and zone are checked first, and the
// offset and UTC time only once both are right, so one mistake gives one message.
export function startProblems(start: ZonedStart | undefined): Partial<Record<StartField, string>> {
  const {local, timeZone, offset, utc} = start ?? {}
  const problems: Partial<Record<StartField, string>> = {}
  if (!local) problems.local = startMessages.missing
  else if (!isLocalTime(local)) problems.local = startMessages.malformed
  if (!timeZone) problems.timeZone = startMessages.zoneMissing
  else if (!isTimeZone(timeZone)) problems.timeZone = startMessages.zoneUnknown
  if (!local || !timeZone || problems.local || problems.timeZone) return problems

  const instants = resolveWallTime(local, timeZone)
  const instant = instants.find((candidate) => candidate.offset === offset)
  if (instants.length === 0) problems.local = startMessages.skipped(timeZone)
  else if (!instant && !offset) {
    problems.offset =
      instants.length === 2 ? startMessages.twice(timeZone) : startMessages.offsetMissing
  } else if (!instant) problems.offset = startMessages.offsetWrong(offset as string, timeZone)
  else if (!utc) problems.utc = startMessages.utcMissing
  else if (utc !== instant.utc) problems.utc = startMessages.utcWrong
  return problems
}
