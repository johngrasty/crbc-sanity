// The empty podcast audio step in Studio's real form runner. It takes the audio off only when an
// edit clears its last field, and never writes when a form opens.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createElement} from 'react'
import type {SanityDocumentLike} from 'sanity'
import {render} from './dom.ts'

// The runner and the registered steps load after tests/dom.ts, which loads Sanity and the schema
// without a window first.
const [{formFollowUpInput}, {formFollowUps}] = await Promise.all([
  import('../structure/FormFollowUpInput'),
  import('../structure/documentConfig'),
])

type FormPatch = {type: string; path: unknown[]; value?: unknown}

// The media item's root input with every registered step, a stored item with nothing published,
// and every onChange recorded.
function itemForm() {
  const sent: FormPatch[][] = []
  const Input = formFollowUpInput({mediaItem: formFollowUps.mediaItem ?? []}, () => ({
    published: null,
    draft: null,
    ready: true,
  }))
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

const audioEnclosure = {
  url: 'https://media.example.org/easter.mp3',
  mimeType: 'audio/mpeg',
  bytes: 48_000_000,
  guid: 'crbc-easter-2026',
}
const item = (_id: string, audio?: Record<string, unknown>): SanityDocumentLike => ({
  _id,
  _type: 'mediaItem',
  _rev: 'r1',
  ...(audio === undefined ? {} : {audioEnclosure: audio}),
})

test('opening a form sends nothing, whatever the podcast audio holds', async () => {
  for (const _id of ['drafts.item', 'versions.rSpring.item', 'item']) {
    for (const audio of [undefined, {}, {url: audioEnclosure.url}, audioEnclosure]) {
      const {sent, form} = itemForm()
      const view = await render(form(item(_id, audio)))
      assert.deepEqual(sent, [], `${_id} ${JSON.stringify(audio)}`)
      await view.unmount()
    }
  }
})

test('clearing the fields one at a time sends one unset, after the last one', async () => {
  for (const last of [{}, {guid: ''}, {guid: null}]) {
    const {sent, form} = itemForm()
    const view = await render(form(item('drafts.item', audioEnclosure)))
    const {mimeType, bytes, guid} = audioEnclosure
    for (const audio of [{mimeType, bytes, guid}, {bytes, guid}, {guid}, last]) {
      await view.rerender(form(item('drafts.item', audio)))
    }
    assert.deepEqual(
      sent.map((patches) => patches.map(({type, path}) => [type, path.join('.')])),
      [[['unset', 'audioEnclosure']]],
      JSON.stringify(last),
    )
    await view.unmount()
  }
})
