import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createElement} from 'react'
import type {SanityDocumentLike} from 'sanity'
import type {FormFollowUp} from '../structure/documentConfig'
import {render} from './dom.ts'

// The runner, the registered steps and the slug history step load after tests/dom.ts, which
// loads Sanity and the schema without a window first. They then come from the module cache.
const [{formFollowUpInput}, {formFollowUps}, {slugHistoryPatch}] = await Promise.all([
  import('../structure/FormFollowUpInput'),
  import('../structure/documentConfig'),
  import('../schemaTypes/media/slug'),
])

type FormPatch = {type: string; path: unknown[]; value?: unknown}

// Studio's form value is the local document with the server head's _rev (getUpdatedSnapshot,
// sanity/lib/index.js:4837-4845). A local edit, or a follow-up patch applied locally, changes the
// value but keeps the _rev until the server's next revision arrives. The tests below keep _rev
// fixed through local edits for the same reason.

// Renders the form's root input for a document type, with the stored versions Sanity's
// useEditState would report, and records every onChange.
function rootForm(
  type: string,
  steps: FormFollowUp[],
  stored: {published?: SanityDocumentLike; draft?: SanityDocumentLike} = {},
) {
  const sent: FormPatch[][] = []
  const Input = formFollowUpInput({[type]: steps}, () => ({
    published: stored.published ?? null,
    draft: stored.draft ?? null,
    ready: true,
  }))
  const form = (value: SanityDocumentLike) =>
    createElement(Input, {
      id: 'root',
      schemaType: {name: type, type: {name: 'document'}},
      value,
      readOnly: false,
      onChange: (patches: FormPatch[]) => sent.push(patches),
      renderDefault: () => null,
    } as never)
  return {sent, form}
}

const sentPaths = (sent: FormPatch[][]) =>
  sent.map((patches) => patches.map(({type, path}) => [type, path.join('.')]))

const slug = (current: string) => ({_type: 'slug', current})
const published: SanityDocumentLike = {
  _id: 'item',
  _type: 'mediaItem',
  _rev: 'p1',
  slug: slug('easter'),
}
// A draft written through the API, with a new slug and none of the history it owes.
const head: SanityDocumentLike = {
  _id: 'drafts.item',
  _type: 'mediaItem',
  _rev: 'r1',
  slug: slug('easter-sunday'),
}
// The draft once the runner's history patch has applied.
const repaired = {
  ...head,
  ...slugHistoryPatch({previous: head, version: head, published, draft: head})?.set,
}
const slugForm = () => rootForm('mediaItem', [slugHistoryPatch], {published, draft: head})

test('a write the server keeps refusing goes out at most three times for its revision', async () => {
  const {sent, form} = slugForm()
  const view = await render(form(head))
  assert.deepEqual(
    sent[0].map(({type, path, value}) => [
      type,
      path,
      (value as {current: string}[]).map(({current}) => current),
    ]),
    [['set', ['slugHistory'], ['easter']]],
  )
  // Each refusal resets the form value to the server's head: a new object with the same _rev.
  // The runner sees a change and computes the same patch.
  for (let refusal = 0; refusal < 5; refusal++) await view.rerender(form(structuredClone(head)))
  assert.equal(sent.length, 3)
  // Once a patch applies, the value has the history, and nothing more goes out.
  await view.rerender(form(repaired))
  assert.equal(sent.length, 3)
  await view.unmount()
})

test("the count starts again when the server's revision advances", async () => {
  const {sent, form} = slugForm()
  const view = await render(form(head))
  for (let refusal = 0; refusal < 5; refusal++) await view.rerender(form(structuredClone(head)))
  assert.equal(sent.length, 3)
  // A new revision that still lacks the history gets the patch again, up to three more times.
  const next = {...head, _rev: 'r2'}
  await view.rerender(form(next))
  assert.equal(sent.length, 4)
  for (let refusal = 0; refusal < 5; refusal++) await view.rerender(form(structuredClone(next)))
  assert.equal(sent.length, 6)
  await view.unmount()
})

test("every step's patch goes out in one onChange", async () => {
  const mark: FormFollowUp = ({version}) => (version.marked === true ? null : {set: {marked: true}})
  const {sent, form} = rootForm('mediaItem', [slugHistoryPatch, mark], {published, draft: head})
  const view = await render(form(head))
  assert.deepEqual(sentPaths(sent), [
    [
      ['set', 'slugHistory'],
      ['set', 'marked'],
    ],
  ])
  await view.unmount()
})

// The next three are real edits that need the same patch again before the server's revision
// moves on. Each needs its second send.

test('a second paste that drops the history gets the repair again, before the server catches up', async () => {
  const {sent, form} = slugForm()
  const view = await render(form(head))
  await view.rerender(form(repaired))
  // A whole-document paste writes the same slug without its history, still at r1.
  await view.rerender(form({...head}))
  assert.deepEqual(sentPaths(sent), [[['set', 'slugHistory']], [['set', 'slugHistory']]])
  await view.unmount()
})

test("returning a service event to a standing slot fills the slot's length again", async () => {
  const start = (local: string) => ({local, timeZone: 'America/New_York'})
  let event: SanityDocumentLike = {
    _id: 'drafts.event',
    _type: 'serviceEvent',
    _rev: 'r1',
    scheduledStart: start('2026-10-11T09:00'),
    expectedDurationMinutes: 80,
  }
  const {sent, form} = rootForm('serviceEvent', formFollowUps.serviceEvent ?? [])
  const view = await render(form(event))
  const edit = (fields: Record<string, unknown>) => {
    event = {...event, ...fields}
    return view.rerender(form(event))
  }
  // Sunday morning to Wednesday night fills 50, which applies locally.
  await edit({scheduledStart: start('2026-10-14T18:30')})
  await edit({expectedDurationMinutes: 50})
  // Off the slot, the length cleared, then back on the slot, all before the server's next
  // revision.
  await edit({scheduledStart: start('2026-10-14T18:31')})
  await edit({expectedDurationMinutes: undefined})
  await edit({scheduledStart: start('2026-10-14T18:30')})
  assert.deepEqual(
    sent.map((patches) => patches.map(({path, value}) => [path.join('.'), value])),
    [[['expectedDurationMinutes', 50]], [['expectedDurationMinutes', 50]]],
  )
  await view.unmount()
})

test('returning a passage to an earlier reference fills its display text again', async () => {
  let passage: Record<string, unknown> = {
    _key: 'a',
    _type: 'passage',
    book: 'Jas',
    chapterStart: 1,
    display: 'James 1',
    generatedDisplay: 'James 1',
  }
  const item = () => ({_id: 'drafts.passage', _type: 'mediaItem', _rev: 'r1', passages: [passage]})
  const {sent, form} = rootForm('mediaItem', formFollowUps.mediaItem ?? [])
  const view = await render(form(item()))
  const edit = (fields: Record<string, unknown>) => {
    passage = {...passage, ...fields}
    return view.rerender(form(item()))
  }
  // James 1 to James 2 fills the display text, which applies locally.
  await edit({chapterStart: 2})
  await edit({display: 'James 2', generatedDisplay: 'James 2'})
  // The editor's own wording, chapter 3, the wording cleared, then back to chapter 2, all before
  // the server's next revision.
  await edit({display: 'Custom'})
  await edit({chapterStart: 3})
  await edit({display: ''})
  await edit({chapterStart: 2})
  assert.equal(sent.length, 2)
  assert.deepEqual(sent[1], sent[0])
  assert.deepEqual(
    sent[1].map(({path, value}) => [path.at(-1), value]),
    [
      ['display', 'James 2'],
      ['generatedDisplay', 'James 2'],
    ],
  )
  await view.unmount()
})
