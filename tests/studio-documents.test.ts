import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness} from './harness.ts'

test('singletons keep only publish, discard and restore', () => {
  const studio = createHarness()
  assert.deepEqual(studio.actions('homePage'), ['publish', 'restore', 'discardChanges'])
  assert.deepEqual(studio.actions('settings'), ['publish', 'restore', 'discardChanges'])
})

test('pages, articles, ministries and announcements add Preview to the defaults', () => {
  const studio = createHarness()
  const defaults = ['publish', 'unpublish', 'duplicate', 'restore', 'discardChanges', 'delete']
  for (const type of ['page', 'article', 'ministry', 'announcement']) {
    assert.deepEqual(studio.actions(type), [...defaults, 'PreviewAction'])
  }
  assert.deepEqual(studio.actions('staff'), defaults)
})

test('singletons have no template', async () => {
  const studio = createHarness()
  for (const type of ['homePage', 'settings', 'siteAlert']) {
    await assert.rejects(studio.create(type), /No template/)
  }
})

test('a new job opening starts as a draft with its field defaults', async () => {
  const studio = createHarness()
  const job = await studio.create('jobOpening')
  assert.match(job._id, /^drafts\.[0-9a-f-]{36}$/)
  assert.equal(job._type, 'jobOpening')
  assert.equal(job.employmentType, 'fullTime')
  assert.equal(job.location, 'Maggie Valley, NC')
  assert.equal(job.acceptingApplications, true)
  assert.equal(job.active, true)
  assert.deepEqual(studio.documents(), [job])
})
