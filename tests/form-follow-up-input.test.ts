import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createElement} from 'react'
import type {SanityDocumentLike} from 'sanity'
import {render} from './dom.ts'

// The runner and the slug history step load after tests/dom.ts, which loads Sanity and the schema
// without a window first. Both then come from the module cache.
const [{formFollowUpInput}, {slugHistoryPatch}] = await Promise.all([
  import('../structure/FormFollowUpInput'),
  import('../schemaTypes/media/slug'),
])

type FormPatch = {type: string; path: unknown[]; value?: unknown}

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

// Renders the form's root input for a media item, with the stored versions Sanity's
// useEditState would report, and records every onChange.
function rootForm(steps = [slugHistoryPatch]) {
  const sent: FormPatch[][] = []
  const Input = formFollowUpInput({mediaItem: steps}, () => ({published, draft: head, ready: true}))
  const form = (value: SanityDocumentLike) =>
    createElement(Input, {
      id: 'root',
      schemaType: {name: 'mediaItem', type: {name: 'document'}},
      value,
      readOnly: false,
      onChange: (patches: FormPatch[]) => sent.push(patches),
      renderDefault: () => null,
    } as never)
  return {sent, form}
}

test('a write the server refuses is sent once for each revision, not again and again', async () => {
  const {sent, form} = rootForm()
  const view = await render(form(head))
  assert.equal(sent.length, 1)
  assert.deepEqual(
    sent[0].map(({type, path, value}) => [
      type,
      path,
      (value as {current: string}[]).map(({current}) => current),
    ]),
    [['set', ['slugHistory'], ['easter']]],
  )
  // The server refuses it, and Sanity resets the form value to the server's head: a new object
  // with the same _rev. The runner sees a change and computes the same patch.
  await view.rerender(form(structuredClone(head)))
  await view.rerender(form(structuredClone(head)))
  assert.equal(sent.length, 1)
  // A new revision that still lacks the history gets the patch again.
  await view.rerender(form({...head, _rev: 'r2'}))
  assert.equal(sent.length, 2)
  // Once a patch applies, the value has the history, and nothing more goes out.
  const keyed = slugHistoryPatch({previous: head, version: head, published, draft: head})?.set
  await view.rerender(form({...head, _rev: 'r3', ...keyed}))
  assert.equal(sent.length, 2)
  await view.unmount()
})

test("every step's patch goes out in one onChange", async () => {
  const mark = ({version}: {version: SanityDocumentLike}) =>
    version.marked === true ? null : {set: {marked: true}}
  const {sent, form} = rootForm([slugHistoryPatch, mark])
  const view = await render(form(head))
  assert.deepEqual(
    sent.map((patches) => patches.map(({type, path}) => [type, path])),
    [
      [
        ['set', ['slugHistory']],
        ['set', ['marked']],
      ],
    ],
  )
  await view.unmount()
})
