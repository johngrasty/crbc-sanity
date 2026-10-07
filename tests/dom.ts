// Renders Studio inputs in jsdom, for what the harness can't check: what an input does in the
// form, such as focus, clicks and the patches it sends. Tests find an input through the
// registered schema, so they render what the form renders. A DOM test file shouldn't import the
// harness, which installs its own window. Each test file runs in its own process.
import {JSDOM} from 'jsdom'
import {act, createElement, type ComponentType, type ReactElement} from 'react'
import {createRoot} from 'react-dom/client'
import {studioTheme, ThemeProvider} from '@sanity/ui'
import {schemaTypes} from '../schemaTypes'

export const noop = () => undefined

// Imports load before this runs, so Sanity and styled-components load without a window, as the
// harness needs too. Sanity UI asks matchMedia for its breakpoints, and jsdom has none.
const dom = new JSDOM('<!doctype html><div id="root"></div>', {url: 'http://localhost/'})
Object.assign(dom.window, {
  matchMedia: (media: string) => ({
    media,
    matches: false,
    addEventListener: noop,
    removeEventListener: noop,
    addListener: noop,
    removeListener: noop,
  }),
})
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
})

// The input component a registered document type sets on one of its fields.
export function fieldInput(typeName: string, fieldName: string): ComponentType<never> {
  const type = schemaTypes.find(({name}) => name === typeName) as
    {fields?: {name: string; components?: {input?: ComponentType<never>}}[]} | undefined
  const input = type?.fields?.find(({name}) => name === fieldName)?.components?.input
  if (!input) throw new Error(`${typeName}.${fieldName} has no custom input`)
  return input
}

// The elementProps Studio's field wrapper passes a primitive input, as PrimitiveField builds
// them. Studio focuses the field through ref when an editor selects one of its markers. events
// records the focus and blur calls the input forwards.
export function primitiveElementProps(id: string) {
  const events: string[] = []
  return {
    id,
    ref: {current: null as HTMLElement | null},
    onFocus: () => events.push('focus'),
    onBlur: () => events.push('blur'),
    onChange: noop,
    readOnly: false,
    'aria-describedby': `${id}_description`,
    events,
  }
}

// Mounts an element inside Sanity UI's theme, as Studio does.
export async function render(element: ReactElement) {
  const root = createRoot(dom.window.document.getElementById('root') as HTMLElement)
  const themed = (child: ReactElement) => createElement(ThemeProvider, {theme: studioTheme}, child)
  await act(async () => root.render(themed(element)))
  return {
    document: dom.window.document,
    rerender: (next: ReactElement) => act(async () => root.render(themed(next))),
    unmount: () => act(async () => root.unmount()),
  }
}

// Runs a click, a focus call or any other interaction, then lets React finish its updates.
export const interact = (run: () => void) => act(async () => run())
