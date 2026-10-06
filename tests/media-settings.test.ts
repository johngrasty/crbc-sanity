import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness} from './harness.ts'

test('the Media section opens the one media settings document', async () => {
  const studio = createHarness()
  const pane = await studio.desk('media', 'mediaSettings')
  assert.equal(pane.type, 'document')
  assert.equal(pane.documentId, 'mediaSettings')
  assert.equal(pane.schemaType, 'mediaSettings')
})

test('media settings keeps only publish, discard and restore, in every version type', () => {
  const studio = createHarness()
  // Sanity's lists for each version type, filtered to the three singleton actions. A release
  // version has none of them, and a scheduled draft only its own publish. Source:
  // /tmp/studio-spec/notes/01-sanity-research.md, question 1.
  const expected = {
    draft: ['publish', 'restore', 'discardChanges'],
    published: ['publish', 'restore', 'discardChanges'],
    version: [],
    'scheduled-draft': ['publish'],
    revision: ['publish', 'restore', 'discardChanges'],
  }
  for (const [versionType, actions] of Object.entries(expected)) {
    assert.deepEqual(
      studio.actions('mediaSettings', versionType as keyof typeof expected),
      actions,
      versionType,
    )
  }
})

test('media settings has no template, so no create menu offers it', async () => {
  const studio = createHarness()
  await assert.rejects(studio.create('mediaSettings'), /No template named "mediaSettings"/)
})
