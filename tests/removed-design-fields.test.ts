import assert from 'node:assert/strict'
import {test} from 'node:test'
import {schemaTypes} from '../schemaTypes/index.ts'
import connectPage from '../schemaTypes/pages/connect.ts'
import hero from '../schemaTypes/sections/hero.ts'
import {
  planUnusedDesignFieldsCleanup,
  summarizeUnusedDesignFields,
} from '../scripts/unused-design-fields-audit.ts'
import {singletonTypes} from '../structure/singletons.ts'
import {createHarness} from './harness.ts'

test('removed designTokens schema, hero.overlay.blendMode, and connectPage.newsletterCta.backgroundColor are absent', async () => {
  assert.equal(
    schemaTypes.some((type) => type.name === 'designTokens'),
    false,
  )
  assert.equal(singletonTypes.has('designTokens'), false)

  const overlay = hero.fields.find((field) => field.name === 'overlay')
  assert.ok(overlay && 'fields' in overlay && Array.isArray(overlay.fields))
  assert.deepEqual(
    overlay.fields.map((field) => field.name),
    ['opacity'],
  )

  const newsletterCta = connectPage.fields.find((field) => field.name === 'newsletterCta')
  assert.ok(newsletterCta && 'fields' in newsletterCta && Array.isArray(newsletterCta.fields))
  assert.deepEqual(
    newsletterCta.fields.map((field) => field.name),
    ['heading', 'subheading', 'primaryButton', 'secondaryButton'],
  )

  const studio = createHarness()
  const root = await studio.desk()
  const rootIds = (root.items ?? []).map((item: {id?: string}) => item.id)
  assert.equal(rootIds.includes('designTokens'), false)
  assert.equal(
    (root.items ?? []).some((item: {title?: string}) => item.title === 'Developer settings'),
    false,
  )
})

test('a homePage draft with hero.overlay.opacity validates cleanly', async () => {
  const studio = createHarness({
    documents: [
      {_id: 'image-hero-1200x800-jpg', _type: 'sanity.imageAsset'},
      {
        _id: 'drafts.homePage',
        _type: 'homePage',
        hero: {
          heading: 'Welcome',
          tagline: 'Join us Sunday',
          backgroundImage: {
            _type: 'image',
            asset: {_type: 'reference', _ref: 'image-hero-1200x800-jpg'},
          },
          overlay: {
            opacity: 0.5,
          },
          primaryCTA: {
            text: 'Plan a Visit',
            link: '/visit',
          },
        },
      },
    ],
  })

  const markers = await studio.validate('drafts.homePage')
  assert.deepEqual(markers, [])
})

test('unused design fields audit and cleanup planner ignore GROQ-projected null and omitted fields', () => {
  const docs = [
    {
      _id: 'homePage',
      _rev: 'r1',
      _type: 'homePage' as const,
      hero: {overlay: {opacity: 0.5, blendMode: null}},
    },
    {
      _id: 'drafts.homePage',
      _rev: 'r2',
      _type: 'homePage' as const,
      hero: {overlay: null},
    },
    {
      _id: 'connectPage',
      _rev: 'r3',
      _type: 'connectPage' as const,
      newsletterCta: {backgroundColor: null},
    },
    {
      _id: 'drafts.connectPage',
      _rev: 'r4',
      _type: 'connectPage' as const,
      newsletterCta: null,
    },
  ]

  assert.deepEqual(summarizeUnusedDesignFields(docs), {
    designTokensDocs: [],
    heroBlendModeDocs: [],
    connectBackgroundColorDocs: [],
    hasCustomNewsletterBackgroundColor: false,
  })
  assert.deepEqual(planUnusedDesignFieldsCleanup(docs), {
    patches: [],
    deletes: [],
  })
})

test('unused design fields cleanup planner builds revision-guarded unset patches and deletes', () => {
  const plan = planUnusedDesignFieldsCleanup([
    {_id: 'designTokens', _rev: 'r1', _type: 'designTokens'},
    {_id: 'drafts.designTokens', _rev: 'r2', _type: 'designTokens'},
    {
      _id: 'homePage',
      _rev: 'r3',
      _type: 'homePage',
      hero: {overlay: {opacity: 0.75, blendMode: 'multiply'}},
    },
    {
      _id: 'drafts.homePage',
      _rev: 'r4',
      _type: 'homePage',
      hero: {overlay: {opacity: 0.6}},
    },
    {
      _id: 'connectPage',
      _rev: 'r5',
      _type: 'connectPage',
      newsletterCta: {backgroundColor: 'bg-blue-50'},
    },
  ])

  assert.deepEqual(plan, {
    patches: [
      {_id: 'connectPage', _rev: 'r5', unset: ['newsletterCta.backgroundColor']},
      {_id: 'homePage', _rev: 'r3', unset: ['hero.overlay.blendMode']},
    ],
    deletes: [{_id: 'designTokens'}, {_id: 'drafts.designTokens'}],
  })
})

test('unused design fields cleanup planner refuses custom newsletter colors and missing revisions', () => {
  assert.throws(
    () =>
      planUnusedDesignFieldsCleanup([
        {
          _id: 'connectPage',
          _rev: 'r1',
          _type: 'connectPage',
          newsletterCta: {backgroundColor: 'bg-amber-100'},
        },
      ]),
    /custom/,
  )

  assert.throws(
    () =>
      planUnusedDesignFieldsCleanup([
        {
          _id: 'homePage',
          _type: 'homePage',
          hero: {overlay: {opacity: 0.5, blendMode: 'multiply'}},
        },
      ]),
    /Missing _rev/,
  )
})
