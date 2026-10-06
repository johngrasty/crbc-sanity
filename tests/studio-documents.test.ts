import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker, type TestDocument} from './harness.ts'

const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)

// What Sanity 4.22.1's plugin chain hands the root resolver for each versionType, with the
// structure tool, tasks, canvas, releases and scheduled drafts. Unnamed actions show their
// displayName. Source: /tmp/studio-spec/notes/01-sanity-research.md, question 1.
const sanityDefaults = {
  draft: [
    'publish',
    'schedule',
    'unpublish',
    'duplicate',
    'restore',
    'discardChanges',
    'TaskCreateAction',
    'linkToCanvas',
    'unlinkFromCanvas',
    'editInCanvas',
    'delete',
  ],
  published: [
    'unpublish',
    'publish',
    'duplicate',
    'restore',
    'discardChanges',
    'delete',
    'TaskCreateAction',
  ],
  version: [
    'duplicate',
    'unpublishVersion',
    'linkToCanvas',
    'unlinkFromCanvas',
    'editInCanvas',
    'discardVersion',
  ],
  'scheduled-draft': ['publish', 'schedule', 'discardVersion'],
  revision: [
    'publish',
    'schedule',
    'unpublish',
    'duplicate',
    'restore',
    'discardChanges',
    'delete',
    'TaskCreateAction',
  ],
}
const versionTypes = Object.keys(sanityDefaults) as (keyof typeof sanityDefaults)[]

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
]

test('singletons keep only publish, discard and restore, in every version type', () => {
  const studio = createHarness()
  const kept = {
    draft: ['publish', 'restore', 'discardChanges'],
    published: ['publish', 'restore', 'discardChanges'],
    version: [],
    'scheduled-draft': ['publish'],
    revision: ['publish', 'restore', 'discardChanges'],
  }
  for (const type of singletons) {
    for (const versionType of versionTypes) {
      assert.deepEqual(
        studio.actions(type, versionType),
        kept[versionType],
        `${type} ${versionType}`,
      )
    }
  }
})

test('pages, articles, ministries and announcements add Preview to the defaults', () => {
  const studio = createHarness()
  for (const versionType of versionTypes) {
    for (const type of ['page', 'article', 'ministry', 'announcement']) {
      const expected = [...sanityDefaults[versionType], 'PreviewAction']
      assert.deepEqual(studio.actions(type, versionType), expected, `${type} ${versionType}`)
    }
    assert.deepEqual(studio.actions('staff', versionType), sanityDefaults[versionType])
  }
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

test('a reference needs a published document, or a version in the same release', async () => {
  // article.author is a strong reference to staff.
  const authorErrors = async (staffId: string, articleId: string) => {
    const studio = createHarness({
      documents: [
        {_id: staffId, _type: 'staff'},
        {_id: articleId, _type: 'article', author: {_type: 'reference', _ref: 'pastor'}},
      ],
    })
    return errorsAt(await studio.validate(articleId), 'author').length
  }
  assert.equal(await authorErrors('pastor', 'drafts.news'), 0)
  assert.equal(await authorErrors('drafts.pastor', 'drafts.news'), 1)
  assert.equal(await authorErrors('versions.rSpring.pastor', 'drafts.news'), 1)
  assert.equal(await authorErrors('versions.rSpring.pastor', 'versions.rSpring.news'), 0)
  assert.equal(await authorErrors('versions.rOther.pastor', 'versions.rSpring.news'), 1)
  assert.equal(await authorErrors('pastor', 'versions.rSpring.news'), 0)
})

test('a reference to a document its release deletes is an error', async () => {
  const article = {
    _id: 'versions.rSpring.news',
    _type: 'article',
    author: {_type: 'reference', _ref: 'pastor'},
  }
  const authorErrors = async (staff: TestDocument[]) => {
    const studio = createHarness({documents: [...staff, article]})
    return errorsAt(await studio.validate(article._id), 'author').length
  }
  const published = {_id: 'pastor', _type: 'staff'}
  const deleted = (_id: string) => ({_id, _type: 'staff', _system: {delete: true}})
  assert.equal(await authorErrors([published, deleted('versions.rSpring.pastor')]), 1)
  assert.equal(await authorErrors([deleted('versions.rSpring.pastor')]), 1)
  assert.equal(await authorErrors([published, deleted('versions.rOther.pastor')]), 0)
})
