import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type FormFollowUp, type TestDocument} from './harness.ts'

const ULID = '01K6Z8Y4N3QJ5W2X7R9T0V1B2C'

const slug = (current: string) => ({_type: 'slug', current})
const item = (fields: Record<string, unknown> = {}): TestDocument => ({
  _id: 'item',
  _type: 'mediaItem',
  contentId: `mi_${ULID}`,
  kind: 'service',
  title: 'Easter Sunday',
  serviceDate: '2026-04-05',
  serviceTimezone: 'America/New_York',
  publicationPolicy: 'auto',
  slug: slug('easter'),
  ...fields,
})
const history = (document: TestDocument | undefined) =>
  ((document?.slugHistory ?? []) as {current: string}[]).map(({current}) => current)

// A stand-in for another ticket's step, registered next to the slug history step. It marks the
// version and clears a scratch field.
const markStep: FormFollowUp = ({version}) =>
  version.marked === true && version.scratch === undefined
    ? null
    : {set: {marked: true}, unset: ['scratch']}
const followUps = {mediaItem: [markStep]}

test('after an edit, every step registered for the type runs, and all their patches apply', async () => {
  const studio = createHarness({documents: [item({scratch: 'x'})], followUps})
  const draft = await studio.edit('item', {set: {slug: slug('easter-sunday')}})
  assert.deepEqual(history(draft), ['easter'])
  assert.equal(draft.marked, true)
  assert.equal(draft.scratch, undefined)
})

test('opening an unedited published document creates no draft, whatever the steps would change', async () => {
  const studio = createHarness({documents: [item({scratch: 'x'})], followUps})
  const before = studio.documents()
  const shown = await studio.open('item')
  assert.equal(shown._id, 'item')
  assert.deepEqual(studio.documents(), before)
})

test('opening a draft written without its follow-ups applies them all, once', async () => {
  // Written through the API: a new slug without the history, and no mark.
  const draft = item({_id: 'drafts.item', _rev: 'api', slug: slug('easter-sunday')})
  const studio = createHarness({documents: [item(), draft], followUps})
  const shown = await studio.open('item')
  assert.equal(shown._id, 'drafts.item')
  assert.deepEqual(history(shown), ['easter'])
  assert.equal(shown.marked, true)
  assert.notEqual(shown._rev, 'api')
  // Once the draft matches, opening it again writes nothing.
  const after = studio.documents()
  await studio.open('item')
  assert.deepEqual(studio.documents(), after)
})

test('opening a release version applies the steps to that version', async () => {
  const version = item({_id: 'versions.rSpring.item', slug: slug('easter-sunday')})
  const studio = createHarness({documents: [item(), version], followUps})
  const shown = await studio.open('item', {release: 'rSpring'})
  assert.equal(shown._id, 'versions.rSpring.item')
  assert.deepEqual(history(shown), ['easter'])
  assert.equal(shown.marked, true)
})

test('a read-only form applies nothing', async () => {
  // With a release pinned, a document with no version in it opens read-only on its draft.
  const draft = item({_id: 'drafts.item', slug: slug('easter-sunday')})
  const studio = createHarness({documents: [item(), draft], followUps})
  const before = studio.documents()
  const shown = await studio.open('item', {release: 'rSpring'})
  assert.equal(shown._id, 'drafts.item')
  assert.deepEqual(studio.documents(), before)
})
