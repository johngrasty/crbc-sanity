import assert from 'node:assert/strict'
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises'
import {URL} from 'node:url'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {test} from 'node:test'
// The runtime CLI exposes its command entry point, but not its archive helper.
const {pathToZip} = await import(
  new URL('./utils/functions/prepare-asset.js', import.meta.resolve('@sanity/runtime-cli'))
)

// Exercises the runtime CLI archive packaging after dependency upgrades.
test('Sanity still packages individual functions and nested asset folders', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'crbc-studio-zip-'))
  try {
    const source = 'export default function handler() { return "fixture" }\n'
    const file = path.join(directory, 'handler.js')
    await writeFile(file, source)
    const single = await pathToZip(file)
    assert.equal(single.readAsText('index.js'), source)
    assert.ok((await single.toBufferPromise()).length > 0)
    await mkdir(path.join(directory, 'nested'))
    await writeFile(path.join(directory, 'nested', 'config.txt'), 'fixture')
    const folder = await pathToZip(directory)
    assert.equal(folder.readAsText('nested/config.txt'), 'fixture')
    assert.equal(folder.readAsText('handler.js'), source)
  } finally {
    await rm(directory, {recursive: true, force: true})
  }
})
