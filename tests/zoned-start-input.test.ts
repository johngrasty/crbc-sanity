import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createElement} from 'react'
import type {Path} from 'sanity'
import {fieldInput, interact, noop, render} from './dom.ts'

const StartInput = fieldInput('serviceEvent', 'scheduledStart')

const normal = {
  local: '2026-10-11T09:00',
  timeZone: 'America/New_York',
  offset: '-04:00',
  utc: '2026-10-11T13:00:00Z',
}
// 1:30 happens twice in New York on November 1, 2026, at UTC-4 and then UTC-5.
const overlap = {local: '2026-11-01T01:30', timeZone: 'America/New_York'}
const overlapSecond = {...overlap, offset: '-05:00', utc: '2026-11-01T06:30:00Z'}

// The start's input with the props Studio's object field passes, as ObjectField builds them.
// focusPath is relative to the start. What the input reports back is recorded.
function studio(value: object) {
  const reported = {paths: [] as Path[], blurs: 0}
  const ref = {current: null as HTMLElement | null}
  const input = (focusPath: Path = []) =>
    createElement(StartInput, {
      value,
      focusPath,
      path: ['scheduledStart'],
      readOnly: false,
      onChange: noop,
      onPathFocus: (path: Path) => reported.paths.push(path),
      elementProps: {
        id: 'scheduledStart',
        ref,
        onFocus: () => reported.paths.push([]),
        onBlur: () => reported.blurs++,
        'aria-describedby': 'scheduledStart_description',
      },
    } as never)
  return {input, reported, ref}
}

const control = (document: Document, label: string) => {
  const element = document.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)
  assert.ok(element, label)
  return element
}

// The focused control, by its label, or by its place among the choices when a time happens
// twice. A failed assert on the elements themselves would print the whole DOM.
function focused(document: Document) {
  const element = document.activeElement as HTMLInputElement | null
  if (element?.type === 'radio') {
    const choices = [...document.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
    return `choice ${choices.indexOf(element) + 1}`
  }
  return element?.getAttribute('aria-label') ?? 'nothing'
}

test("Studio's field ref focuses the start's date and time", async () => {
  const {input, ref} = studio(normal)
  const view = await render(input())
  await interact(() => ref.current?.focus())
  assert.equal(focused(view.document), 'Date and time')
  await view.unmount()
})

test('focusing a control reports its field to Studio, and leaving it reports a blur', async () => {
  const {input, reported} = studio(normal)
  const view = await render(input())
  await interact(() => control(view.document, 'Date and time').focus())
  await interact(() => control(view.document, 'Time zone').focus())
  assert.deepEqual(reported.paths, [['local'], ['timeZone']])
  assert.equal(reported.blurs, 1)
  await interact(() => control(view.document, 'Time zone').blur())
  assert.equal(reported.blurs, 2)
  await view.unmount()
})

test("choosing a marker on one of the start's fields moves focus to its control", async () => {
  const {input} = studio(normal)
  const view = await render(input())
  await interact(() => control(view.document, 'Time zone').focus())
  await view.rerender(input(['local']))
  assert.equal(focused(view.document), 'Date and time')
  await view.rerender(input(['timeZone']))
  assert.equal(focused(view.document), 'Time zone')
  // The UTC time has no control of its own. Entering the time again fixes it.
  await view.rerender(input(['utc']))
  assert.equal(focused(view.document), 'Date and time')
  await view.unmount()
})

test('an offset marker focuses the choices when a time happens twice', async () => {
  const unchosen = studio(overlap)
  const first = await render(unchosen.input())
  await interact(() => control(first.document, 'Time zone').focus())
  await first.rerender(unchosen.input(['offset']))
  assert.equal(focused(first.document), 'choice 1')
  assert.deepEqual(unchosen.reported.paths.at(-1), ['offset'])
  await first.unmount()

  // With a reading chosen, the marker focuses that one.
  const chosen = studio(overlapSecond)
  const second = await render(chosen.input())
  await second.rerender(chosen.input(['offset']))
  assert.equal(focused(second.document), 'choice 2')
  await second.unmount()
})
