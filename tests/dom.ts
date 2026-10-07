// Renders Studio inputs in jsdom, for what the harness can't check: what an input does in the
// form, such as focus, clicks and the patches it sends. Tests find an input through the
// registered schema, so they render what the form renders. A DOM test file shouldn't import the
// harness, which installs its own window. Each test file runs in its own process.
//
// Import this module before anything that loads Sanity or React DOM. React DOM checks which
// browser features exist once, when it loads. Without a document, it handles text inputs through
// an old Internet Explorer event path that throws in jsdom as soon as one gets focus. Sanity
// breaks if a window exists while it loads, so the two can't load at the same moment. This module
// sets the window and runs React DOM, removes the window while Sanity, Sanity UI and the schema
// load, then sets it again for the tests.
import {createRequire} from 'node:module'
import {JSDOM} from 'jsdom'
import {act, createElement, type ComponentType, type ReactElement} from 'react'
import type * as ReactDomClient from 'react-dom/client'

export const noop = () => undefined

// Sanity UI asks matchMedia for its breakpoints, and jsdom has none.
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
const domGlobals = {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
}
const setDom = (on: boolean) => {
  for (const [name, value] of Object.entries(domGlobals)) {
    if (on) Object.assign(globalThis, {[name]: value})
    else delete (globalThis as Record<string, unknown>)[name]
  }
}

// React DOM is CommonJS, so require runs it at once, and Sanity's own import of it later gets
// this instance from the module cache. Node's ESM loader caches a CommonJS module when it links
// an import, before running it, so only a loaded one means React DOM ran without the document.
const require = createRequire(import.meta.url)
if (require.cache[require.resolve('react-dom/client')]?.loaded) {
  throw new Error('React DOM loaded before tests/dom.ts. Import tests/dom.ts first.')
}
setDom(true)
const {createRoot} = require('react-dom/client') as typeof ReactDomClient
setDom(false)
const [{studioTheme, ThemeProvider}, {schemaTypes}] = await Promise.all([
  import('@sanity/ui'),
  import('../schemaTypes'),
])
setDom(true)

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
