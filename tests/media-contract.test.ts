// Drift checks for Studio's copy of the media contract. The integration owner runs these with
// MEDIA_CONTRACT_DIR set to a contract checkout before merging.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync, readdirSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {test} from 'node:test'
import {fileURLToPath} from 'node:url'
import {contractFiles} from '../scripts/sync-media-contract.ts'

const copy = fileURLToPath(new URL('../media-contract/', import.meta.url))
const manifest = JSON.parse(readFileSync(join(copy, 'manifest.json'), 'utf8'))
const listed = Object.keys(manifest.files).sort()

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

test('the manifest names the contract repo and commit the copy came from', () => {
  assert.equal(manifest.repo, 'johngrasty/subsplash-replacement')
  assert.equal(manifest.path, 'contract')
  assert.match(manifest.commit, /^[0-9a-f]{40}$/)
})

test('every copied contract file matches its hash in the manifest', () => {
  const present = readdirSync(copy, {recursive: true, withFileTypes: true})
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(copy.length))
    .filter((file) => file !== 'manifest.json')
    .sort()
  assert.deepEqual(present, listed)
  for (const file of listed) {
    assert.equal(sha256(readFileSync(join(copy, file))), manifest.files[file], file)
  }
})

test('the copy matches the contract checkout byte for byte', (t) => {
  const checkout = process.env.MEDIA_CONTRACT_DIR
  if (!checkout) {
    t.skip('MEDIA_CONTRACT_DIR is not set, so the copy was not compared with a checkout')
    return
  }
  assert.deepEqual(contractFiles(checkout), listed)
  for (const file of listed) {
    const same = readFileSync(join(checkout, file)).equals(readFileSync(join(copy, file)))
    assert.ok(same, `${file} differs from ${checkout}. Run npm run contract:sync.`)
  }
})
