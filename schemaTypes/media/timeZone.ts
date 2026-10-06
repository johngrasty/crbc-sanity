// The time zone rule shared by media items and service events.

// The church's zone, where every standing service takes place.
export const CHURCH_TIME_ZONE = 'America/New_York'

// Area/Location, or Area/Location/Sublocation, with every part starting with a capital letter.
const ZONE_NAME = /^[A-Z][A-Za-z0-9_+-]*(\/[A-Z][A-Za-z0-9_+-]*)+$/

// An IANA zone name such as America/New_York that Intl knows. The pattern rejects what Intl
// accepts but isn't a zone name: offsets such as +05:00, bare names such as EST and UTC, and
// lower-case spellings. Intl matches names in any letter case, so a value that differs from the
// name Intl resolves it to only by case, such as AMERICA/NEW_YORK, is another spelling and fails.
// A value that differs by more is an alias and passes, because Node 22 resolves Asia/Kolkata to
// Asia/Calcutta and some browsers don't.
export function isTimeZone(value: string): boolean {
  if (!ZONE_NAME.test(value)) return false
  let resolved: string
  try {
    resolved = new Intl.DateTimeFormat('en-US', {timeZone: value}).resolvedOptions().timeZone
  } catch {
    return false
  }
  return resolved === value || resolved.toLowerCase() !== value.toLowerCase()
}

export const timeZoneMessage =
  'Use the standard time zone name, such as America/New_York or America/Chicago.'
