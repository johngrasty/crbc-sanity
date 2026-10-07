import assert from 'node:assert/strict'
import {mock, test} from 'node:test'
import {createHarness} from './harness.ts'

// Sanity warns, and says it will later refuse, when a document list with a custom filter sets
// no API version. Opening every filtered list in the Media section gives no such warning.
test('the filtered lists in the Media section set an API version', async () => {
  const studio = createHarness()
  const warn = mock.method(console, 'warn', () => {})
  try {
    for (const path of [
      ['media', 'serviceEvents', 'upcomingEvents'],
      ['media', 'serviceEvents', 'pastEvents'],
      ['media', 'serviceEvents', 'cancelledEvents'],
      ['media', 'heldItems'],
    ]) {
      await studio.desk(...path)
    }
  } finally {
    warn.mock.restore()
  }
  const missing = warn.mock.calls
    .map((call) => String(call.arguments[0]))
    .filter((message) => message.includes('No apiVersion specified'))
    .filter((message) => /serviceEvent|mediaItem/.test(message))
  assert.deepEqual(missing, [])
})
