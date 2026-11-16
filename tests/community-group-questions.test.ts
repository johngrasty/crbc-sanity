import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker, type TestDocument} from './harness.ts'

const errorPaths = (markers: Marker[]) =>
  markers.filter((marker) => marker.level === 'error').map((marker) => marker.path)

const week = (id: string, fields: Record<string, unknown> = {}): TestDocument => ({
  _id: id,
  _type: 'communityGroupQuestions',
  title: 'Sweet Contentment',
  passage: 'Philippians 4:10–13',
  weekOf: '2026-11-16',
  slug: {_type: 'slug', current: 'sweet-contentment'},
  sections: [
    {
      _key: 's1',
      _type: 'questionSection',
      heading: "Paul's Joy",
      verses: 'v. 10',
      background: [
        {
          _key: 'b1',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'c1', _type: 'span', text: 'Paul rejoiced in the Lord.', marks: []}],
        },
      ],
      question: 'Who has God used to meet a need?',
    },
  ],
  ...fields,
})

test('a complete week of questions has no validation errors', async () => {
  const studio = createHarness()
  assert.deepEqual(errorPaths(await studio.validate(week('drafts.w1'))), [])
})

test('a week needs a title, passage, week, web address and at least one section', async () => {
  const studio = createHarness()
  const empty: TestDocument = {_id: 'drafts.w1', _type: 'communityGroupQuestions'}
  assert.deepEqual(errorPaths(await studio.validate(empty)).sort(), [
    'passage',
    'sections',
    'slug',
    // Sanity's slug type also requires its current value.
    'slug.current',
    'title',
    'weekOf',
  ])
  assert.deepEqual(errorPaths(await studio.validate(week('drafts.w2', {sections: []}))), [
    'sections',
  ])
})

test('each section needs a heading and a question', async () => {
  const studio = createHarness()
  const document = week('drafts.w1', {
    sections: [{_key: 's1', _type: 'questionSection', verses: 'v. 10'}],
  })
  assert.deepEqual(errorPaths(await studio.validate(document)).sort(), [
    'sections[_key=="s1"].heading',
    'sections[_key=="s1"].question',
  ])
})

test('the desk lists weeks of questions newest first', async () => {
  const studio = createHarness({
    documents: [
      week('older', {title: 'Older', weekOf: '2026-11-09', slug: {current: 'older'}}),
      week('newer', {title: 'Newer', weekOf: '2026-11-16', slug: {current: 'newer'}}),
    ],
  })
  const pane = await studio.desk('communityGroupQuestions')
  assert.equal(pane.type, 'documentList')
  assert.deepEqual(
    pane.documents?.map((document) => document.title),
    ['Newer', 'Older'],
  )
})
