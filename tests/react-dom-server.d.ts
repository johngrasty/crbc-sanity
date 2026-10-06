// The Studio has react-dom without its types. The harness uses this one function from it.
declare module 'react-dom/server' {
  import type {ReactNode} from 'react'
  export function renderToStaticMarkup(node: ReactNode): string
}
