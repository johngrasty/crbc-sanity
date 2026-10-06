// The time zone rule shared by media items and service events.

// The church's zone, where every standing service takes place.
export const CHURCH_TIME_ZONE = 'America/New_York'

// Area/Location, or Area/Location/Sublocation, with every part starting with a capital letter.
const ZONE_NAME = /^[A-Z][A-Za-z0-9_+-]*(\/[A-Z][A-Za-z0-9_+-]*)+$/

// An IANA zone name such as America/New_York that Intl knows. The pattern rejects what Intl
// accepts but isn't a zone name: offsets such as +05:00, bare names such as EST and UTC, and
// lower-case spellings. It doesn't compare the value with Intl's resolved name, because Node 22
// resolves Asia/Kolkata to Asia/Calcutta and some browsers don't.
export function isTimeZone(value: string): boolean {
  if (!ZONE_NAME.test(value)) return false
  try {
    new Intl.DateTimeFormat('en-US', {timeZone: value})
    return true
  } catch {
    return false
  }
}

export const timeZoneMessage =
  'Use the standard time zone name, such as America/New_York or America/Chicago.'
