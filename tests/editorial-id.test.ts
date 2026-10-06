import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness} from './harness.ts'

// The five editorial types and their ID fields. Types other tickets haven't registered yet are
// checked once they are.
const idFields = {
  mediaItem: 'contentId',
  serviceEvent: 'eventId',
  series: 'seriesId',
  speaker: 'speakerId',
  topic: 'topicId',
}

const registered = (studio: ReturnType<typeof createHarness>) =>
  Object.entries(idFields).filter(([type]) => studio.schemaType(type))

test('AI Assist never writes an editorial ID', () => {
  const studio = createHarness()
  const types = registered(studio)
  assert.ok(types.some(([type]) => type === 'mediaItem'))
  for (const [type, field] of types) {
    const id = studio.schemaType(type)?.fields.find(({name}) => name === field)
    assert.equal(id?.assistExcluded, true, type)
  }
})

// Every ID guard relies on drafts: with live edit, edits go straight to the published document
// and nothing validates them first (/tmp/studio-spec/reviews/ids-fable-5.1.md, finding 7).
test('no editorial type uses live edit', () => {
  const studio = createHarness()
  for (const [type] of registered(studio)) {
    assert.equal(studio.schemaType(type)?.liveEdit, false, type)
  }
})
