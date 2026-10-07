import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createElement} from 'react'
import {fieldInput, interact, noop, primitiveElementProps, render} from './dom.ts'

const PolicyInput = fieldInput('mediaItem', 'publicationPolicy')

const policyInput = (props: Record<string, unknown>) =>
  createElement(PolicyInput, {
    value: undefined,
    readOnly: false,
    onChange: noop,
    ...props,
  } as never)

const radios = (document: Document) => [
  ...document.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
]

// An item saved without a policy shows the Required marker. Selecting the marker makes Studio
// focus the field through the ref it passed in elementProps.
test('Studio can focus the publication policy through the ref it supplies', async () => {
  const elementProps = primitiveElementProps('publicationPolicy')
  const view = await render(policyInput({elementProps}))
  await interact(() => elementProps.ref.current?.focus())
  // Compare a value, not the elements, because a failed assert would print the whole DOM.
  const focused = view.document.activeElement as HTMLInputElement
  assert.equal(focused.type, 'radio')
  assert.equal(focused.value, radios(view.document)[0].value)
  await interact(() => focused.blur())
  assert.deepEqual(elementProps.events, ['focus', 'blur'])
  await view.unmount()
})

test("each publication policy choice is described by the field's description", async () => {
  const elementProps = primitiveElementProps('publicationPolicy')
  const view = await render(policyInput({elementProps}))
  const describedBy = radios(view.document).map((radio) => radio.getAttribute('aria-describedby'))
  assert.deepEqual(describedBy, [
    elementProps['aria-describedby'],
    elementProps['aria-describedby'],
  ])
  await view.unmount()
})

test('each choice says what it does, selects on a click of its text, and is off when read-only', async () => {
  const patches: {type?: string; value?: unknown}[] = []
  const onChange = (patch: {type?: string; value?: unknown}) => patches.push(patch)
  const elementProps = primitiveElementProps('publicationPolicy')
  const view = await render(policyInput({elementProps, onChange}))
  const labels = [...view.document.querySelectorAll('label')].map(({textContent}) => textContent)
  assert.equal(labels.length, 2)
  assert.match(String(labels[0]), /^Automatic.*passes the checks/)
  assert.match(String(labels[1]), /^Manual.*approves it in media-ops/)

  await interact(() => view.document.querySelectorAll('label')[1].click())
  assert.deepEqual(
    patches.map(({type, value}) => ({type, value})),
    [{type: 'set', value: 'manual'}],
  )

  await view.rerender(policyInput({elementProps, onChange, value: 'manual', readOnly: true}))
  assert.deepEqual(
    radios(view.document).map(({disabled}) => disabled),
    [true, true],
  )
  await interact(() => view.document.querySelectorAll('label')[0].click())
  assert.equal(patches.length, 1)
  await view.unmount()
})
