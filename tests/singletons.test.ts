import assert from 'node:assert/strict'
import {test} from 'node:test'
import {singletonTypes} from '../structure/singletons.ts'
import {createHarness} from './harness.ts'

// Every singleton, each opened at its type name in deskStructure.ts.
const singletons = [
  'homePage',
  'aboutPage',
  'connectPage',
  'beliefsPage',
  'givingPage',
  'visitPage',
  'servicesPage',
  'watchPage',
  'calendarPage',
  'lifeGroupsPage',
  'communityGroupsPage',
  'settings',
  'siteAlert',
  'designTokens',
  'mainMenu',
  'footerMenu',
  'footerSettings',
  'mediaSettings',
]

// The lists Sanity 4.22.1 resolves for each version type. Releases and scheduled drafts are off
// (structure/documentConfig.ts), so a version gets the draft's list and a scheduled draft gets
// the structure tool's defaults. See tests/media-settings.test.ts.
const fixedActions = {
  draft: ['publish', 'restore', 'discardChanges'],
  published: ['publish', 'restore', 'discardChanges'],
  version: ['publish', 'restore', 'discardChanges'],
  'scheduled-draft': ['publish', 'restore', 'discardChanges'],
  revision: ['publish', 'restore', 'discardChanges'],
}
const versionTypes = Object.keys(fixedActions) as (keyof typeof fixedActions)[]

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

test('this file covers every singleton', () => {
  assert.deepEqual([...singletonTypes].sort(), [...singletons].sort())
})

// A copy under another ID would be a second document of the type, and the website reads each
// singleton with *[_type == "homePage"][0] and the like. An editor can delete the copy but
// never publish it. Ticket #44.
test('a singleton under any other ID has only delete, in every version type', () => {
  const studio = createHarness()
  for (const type of singletons) {
    for (const documentId of ['other', '0b6f3c2e-5d4a-4e8b-9f1c-2a7d6e5b4c3a']) {
      for (const versionType of versionTypes) {
        assert.deepEqual(
          studio.actions(type, versionType, {documentId}),
          ['delete'],
          `${type} ${documentId} ${versionType}`,
        )
      }
    }
  }
})

test("every singleton's fixed document keeps publish, discard and restore, in every version type", () => {
  const studio = createHarness()
  for (const type of singletons) {
    for (const versionType of versionTypes) {
      assert.deepEqual(
        studio.actions(type, versionType, {documentId: type}),
        fixedActions[versionType],
        `${type} ${versionType}`,
      )
    }
  }
})

// Studio doesn't refuse a create intent for a singleton with no template. Sanity 4.22.1 gives it
// a random ID and, with no pane on the desk for that ID, opens its plain editor with an empty
// form. It throws only when the intent names a template that doesn't exist.
test('a home page from a create intent gets a random ID and only delete', async () => {
  const studio = createHarness()
  const pane = await studio.intent('create', {type: 'homePage'})
  assert.match(pane.documentId, UUID)
  assert.deepEqual(pane.path, [`__edit__${pane.documentId}`])
  assert.equal(pane.schemaType, 'homePage')
  assert.deepEqual(pane.initialValue, {_id: pane.documentId, _type: 'homePage'})
  for (const versionType of versionTypes) {
    assert.deepEqual(
      studio.actions('homePage', versionType, {documentId: pane.documentId}),
      ['delete'],
      versionType,
    )
  }
})
