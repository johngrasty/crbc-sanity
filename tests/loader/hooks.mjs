// Node module hooks that let tests import Studio code the way Vite does.
// resolve: Studio imports are extensionless (./page) and some name a folder (./schemaTypes),
// so a failed relative import is retried with .ts, .tsx and an index file.
// load: TypeScript and TSX are compiled with esbuild, because Node's type stripping
// can't handle JSX.
import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {transform} from 'esbuild'

const retryable = new Set(['ERR_MODULE_NOT_FOUND', 'ERR_UNSUPPORTED_DIR_IMPORT'])
const suffixes = ['.ts', '.tsx', '/index.ts', '/index.tsx']
const compiled = /\.(ts|tsx)$/

const isStudioFile = (url) => url?.startsWith('file:') && !url.includes('/node_modules/')
const isRelative = (specifier) => specifier.startsWith('./') || specifier.startsWith('../')

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    if (!retryable.has(error?.code) || !isRelative(specifier) || !isStudioFile(context.parentURL)) {
      throw error
    }
    for (const suffix of suffixes) {
      try {
        return await nextResolve(specifier + suffix, context)
      } catch (retryError) {
        if (!retryable.has(retryError?.code)) throw retryError
      }
    }
    throw error
  }
}

export async function load(url, context, nextLoad) {
  const path = url.split('?')[0]
  if (!isStudioFile(path) || !compiled.test(path)) return nextLoad(url, context)
  const filename = fileURLToPath(path)
  const {code} = await transform(await readFile(filename, 'utf8'), {
    loader: path.endsWith('.tsx') ? 'tsx' : 'ts',
    format: 'esm',
    jsx: 'automatic',
    target: 'node22',
    sourcefile: filename,
    sourcemap: 'inline',
  })
  return {format: 'module', source: code, shortCircuit: true}
}
