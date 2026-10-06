// The church's standing services, from Studio's copy of the contract's standing schedule. media-ops
// raises its T-24h alert from the same file, so the two agree on every slot.
import schedule from '../../media-contract/standing-schedule.json' with {type: 'json'}
import {isLocalTime, resolveWallTime, type ZonedStart} from './zonedStart'

export type StandingSlot = {
  slot: string
  label: string
  weekday: string
  localStart: string
  expectedDurationMinutes: number
  timeZone: string
}

export const standingSlots: StandingSlot[] = schedule.slots.map((slot) => ({
  ...slot,
  timeZone: schedule.timezone,
}))

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const DAY = 86_400_000

// YYYY-MM-DD and its weekday, for a day counted in whole days from 1970-01-01.
const dayOf = (days: number) => {
  const date = new Date(days * DAY)
  return {date: date.toISOString().slice(0, 10), weekday: WEEKDAYS[date.getUTCDay()]}
}

// The day number of the calendar date the zone's clocks show at an instant.
function zoneDay(instant: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {timeZone, year: 'numeric', month: 'numeric', day: 'numeric'})
      .formatToParts(instant)
      .map(({type, value}) => [type, Number(value)]),
  )
  return Date.UTC(parts.year, parts.month - 1, parts.day) / DAY
}

// The slot's first start after the instant after, in the slot's zone. A day whose start the
// clocks skip is passed over. When the start happens twice, the earlier reading counts.
export function nextOccurrence(slot: StandingSlot, after: number): ZonedStart {
  const today = zoneDay(after, slot.timeZone)
  for (let day = today; day <= today + 14; day++) {
    const {date, weekday} = dayOf(day)
    if (weekday !== slot.weekday) continue
    const local = `${date}T${slot.localStart}`
    const instant = resolveWallTime(local, slot.timeZone).find(({utc}) => Date.parse(utc) > after)
    if (instant) return {local, timeZone: slot.timeZone, ...instant}
  }
  throw new Error(
    `${slot.slot} has no start in the two weeks after ${new Date(after).toISOString()}`,
  )
}

// The standing slot a start falls on: the same weekday, local time and zone.
export function slotAt(start: ZonedStart | undefined): StandingSlot | undefined {
  const {local, timeZone} = start ?? {}
  if (!local || !timeZone || !isLocalTime(local)) return undefined
  const [date, time] = local.split('T')
  const {weekday} = dayOf(Date.parse(`${date}T00:00:00Z`) / DAY)
  return standingSlots.find(
    (slot) => slot.timeZone === timeZone && slot.weekday === weekday && slot.localStart === time,
  )
}
