// What the harness client shows at each API version and perspective. Content Lake added release
// versions at API version 2025-02-19: from then on raw includes versions.* documents and the
// default perspective is published. Before it, the default is raw and raw leaves versions out.
// Source: https://www.sanity.io/docs/changelog/676aaa9d-2da6-44fb-abe5-580f28047c10
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness} from './harness.ts'

const published = ['item']
const withDraft = ['drafts.item', 'item']
const withRelease = ['drafts.item', 'item', 'versions.rSpring.item']

// The _id values a schema rule sees when it queries through ValidationContext.getClient with
// this API version and perspective. The harness's probe type reports them as an info marker.
async function seen(apiVersion: string, perspective?: string): Promise<string[]> {
  const studio = createHarness({
    documents: ['item', 'drafts.item', 'versions.rSpring.item'].map((_id) => ({
      _id,
      _type: 'mediaItem',
    })),
  })
  const markers = await studio.validate({
    _id: 'probe',
    _type: 'harnessClientProbe',
    query: {apiVersion, perspective},
  })
  const report = markers.find(({path, level}) => path === 'query' && level === 'info')
  assert.ok(report, `no report in ${JSON.stringify(markers)}`)
  return JSON.parse(report.message)
}

test('explicit raw includes release versions from API version 2025-02-19', async () => {
  assert.deepEqual(await seen('2021-06-07', 'raw'), withDraft)
  assert.deepEqual(await seen('2025-02-18', 'raw'), withDraft)
  assert.deepEqual(await seen('2025-02-19', 'raw'), withRelease)
  assert.deepEqual(await seen('v2025-02-19', 'raw'), withRelease)
  assert.deepEqual(await seen('vX', 'raw'), withRelease)
})

test('the default perspective is raw before 2025-02-19 and published from it', async () => {
  assert.deepEqual(await seen('2025-02-18'), withDraft)
  assert.deepEqual(await seen('2025-02-19'), published)
  assert.deepEqual(await seen('vX'), published)
})

test('the published perspective shows only published documents at any API version', async () => {
  assert.deepEqual(await seen('2021-06-07', 'published'), published)
  assert.deepEqual(await seen('2025-02-19', 'published'), published)
})

// Content Lake's drafts perspective shows each document once, under its published _id.
test('the drafts perspective shows each document once from API version 2025-02-19', async () => {
  assert.deepEqual(await seen('2025-02-19', 'drafts'), published)
  assert.deepEqual(await seen('vX', 'drafts'), published)
})

test('no create menu offers the probe type, which only the harness registers', async () => {
  const studio = createHarness()
  assert.ok(!studio.createMenu().includes('harnessClientProbe'))
  await assert.rejects(studio.create('harnessClientProbe'), /No template/)
})
