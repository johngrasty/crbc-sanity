import assert from 'node:assert/strict'
import {test} from 'node:test'
import designTokens from '../schemaTypes/designTokens.ts'
import connectPage from '../schemaTypes/pages/connect.ts'
import hero from '../schemaTypes/sections/hero.ts'
import {summarizeUnusedDesignFields} from '../scripts/unused-design-fields-audit.ts'
import {createHarness} from './harness.ts'

test('deprecated design fields are read-only with no defaults for new values', () => {
  assert.equal(designTokens.readOnly, true)
  assert.ok(designTokens.deprecated?.reason)

  const overlay = hero.fields.find((field) => field.name === 'overlay')
  assert.ok(overlay && 'fields' in overlay && Array.isArray(overlay.fields))
  const blendMode = overlay.fields.find((field) => field.name === 'blendMode')
  assert.ok(blendMode)
  assert.equal(blendMode.readOnly, true)
  assert.ok(blendMode.deprecated?.reason)
  assert.equal('initialValue' in blendMode ? blendMode.initialValue : undefined, undefined)

  const newsletterCta = connectPage.fields.find((field) => field.name === 'newsletterCta')
  assert.ok(newsletterCta && 'fields' in newsletterCta && Array.isArray(newsletterCta.fields))
  const backgroundColor = newsletterCta.fields.find((field) => field.name === 'backgroundColor')
  assert.ok(backgroundColor)
  assert.equal(backgroundColor.readOnly, true)
  assert.ok(backgroundColor.deprecated?.reason)
  assert.equal(
    'initialValue' in backgroundColor ? backgroundColor.initialValue : undefined,
    undefined,
  )
})

test('a homePage draft with hero.overlay.opacity and no blendMode validates cleanly', async () => {
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

test('unused design fields audit ignores GROQ-projected null and undefined omitted fields', () => {
  const report = summarizeUnusedDesignFields([
    {
      _id: 'homePage',
      _rev: 'r1',
      _type: 'homePage',
      hero: {overlay: {opacity: 0.5, blendMode: null}},
    },
    {
      _id: 'drafts.homePage',
      _rev: 'r2',
      _type: 'homePage',
      hero: {overlay: null},
    },
    {
      _id: 'connectPage',
      _rev: 'r3',
      _type: 'connectPage',
      newsletterCta: {backgroundColor: null},
    },
    {
      _id: 'drafts.connectPage',
      _rev: 'r4',
      _type: 'connectPage',
      newsletterCta: null,
    },
  ])

  assert.deepEqual(report, {
    designTokensDocs: [],
    heroBlendModeDocs: [],
    connectBackgroundColorDocs: [],
    hasCustomNewsletterBackgroundColor: false,
  })
})

test('unused design fields audit reports published and draft docs and flags custom colors', () => {
  const report = summarizeUnusedDesignFields([
    {_id: 'designTokens', _rev: 'r1', _type: 'designTokens'},
    {_id: 'drafts.designTokens', _rev: 'r2', _type: 'designTokens'},
    {
      _id: 'homePage',
      _rev: 'r3',
      _type: 'homePage',
      hero: {overlay: {opacity: 0.4, blendMode: 'multiply'}},
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
    {
      _id: 'drafts.connectPage',
      _rev: 'r6',
      _type: 'connectPage',
      newsletterCta: {backgroundColor: 'bg-amber-100'},
    },
  ])

  assert.equal(report.designTokensDocs.length, 2)
  assert.deepEqual(
    report.designTokensDocs.map((doc) => doc._id),
    ['designTokens', 'drafts.designTokens'],
  )
  assert.deepEqual(report.heroBlendModeDocs, [
    {_id: 'homePage', _rev: 'r3', isDraft: false, blendMode: 'multiply', opacity: 0.4},
  ])
  assert.deepEqual(report.connectBackgroundColorDocs, [
    {
      _id: 'connectPage',
      _rev: 'r5',
      isDraft: false,
      backgroundColor: 'bg-blue-50',
      isCustomValue: false,
    },
    {
      _id: 'drafts.connectPage',
      _rev: 'r6',
      isDraft: true,
      backgroundColor: 'bg-amber-100',
      isCustomValue: true,
    },
  ])
  assert.equal(report.hasCustomNewsletterBackgroundColor, true)
})
