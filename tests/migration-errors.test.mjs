import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import process from 'node:process'
import {test} from 'node:test'
import {URL} from 'node:url'

const helperUrl = new URL('../scripts/run-migration.ts', import.meta.url).href

test('migration failures exit unsuccessfully without exposing SDK credentials', () => {
  const secret = 'fixture-private-credential'
  const result = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--input-type=module',
      '-e',
      `import {runMigration} from ${JSON.stringify(helperUrl)};
       await runMigration(async () => {
         throw Object.assign(new Error(${JSON.stringify(secret)}), {
           request: {headers: {authorization: 'Bearer ' + ${JSON.stringify(secret)}}}
         });
       });`,
    ],
    {encoding: 'utf8'},
  )
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Verify the document state before retrying/)
  assert.ok(!(result.stdout + result.stderr).includes(secret))
})

test('a successful migration preserves its output and exit status', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--input-type=module',
      '-e',
      `import {runMigration} from ${JSON.stringify(helperUrl)};
       await runMigration(async () => { console.log('Migration verified'); });`,
    ],
    {encoding: 'utf8'},
  )
  assert.equal(result.status, 0)
  assert.match(result.stdout, /Migration verified/)
})
