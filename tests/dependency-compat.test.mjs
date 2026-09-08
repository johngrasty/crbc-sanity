import assert from 'node:assert/strict'
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {test} from 'node:test'
import {assets} from '@sanity/runtime-cli/actions/blueprints'

// Exercises the Sanity consumer affected by the adm-zip security override.
test('Sanity still packages individual functions and nested asset folders', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'crbc-studio-zip-'))
  try {
    const source = 'export default function handler() { return "fixture" }\n'
    const file = path.join(directory, 'handler.js')
    await writeFile(file, source)
    const single = await assets.pathToB64ZipHash(file)
    assert.equal(single.zip.readAsText('index.js'), source)
    assert.ok(single.buffer.length > 0)
    assert.equal(single.b64, single.buffer.toString('base64'))
    await mkdir(path.join(directory, 'nested'))
    await writeFile(path.join(directory, 'nested', 'config.txt'), 'fixture')
    const folder = await assets.pathToB64ZipHash(directory)
    assert.equal(folder.zip.readAsText('nested/config.txt'), 'fixture')
    assert.equal(folder.zip.readAsText('handler.js'), source)
    assert.equal(folder.hash.length, 64)
  } finally {
    await rm(directory, {recursive: true, force: true})
  }
})
