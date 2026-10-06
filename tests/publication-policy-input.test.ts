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
