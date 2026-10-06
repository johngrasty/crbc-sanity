import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHarness, type Marker} from './harness.ts'

const errorsAt = (markers: Marker[], path: string) =>
  markers.filter((marker) => marker.level === 'error' && marker.path === path)

const settings = (fields: Record<string, unknown>) => ({
  _id: 'drafts.mediaSettings',
  _type: 'mediaSettings',
  ...fields,
})

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

test('no create menu offers media settings', () => {
  const studio = createHarness()
  const global = studio.createMenu()
  assert.ok(global.includes('mediaItem'), 'the global menu still offers media items')
  assert.ok(!global.includes('mediaSettings'), 'global')
  const structure = studio.createMenu({type: 'structure', schemaType: 'mediaSettings'})
  assert.deepEqual(structure, [], 'structure')
  const reference = studio.createMenu({type: 'document', documentId: 'x', schemaType: 'mediaItem'})
  assert.ok(!reference.includes('mediaSettings'), 'reference field')
})

test('a missing title template is an error', async () => {
  const studio = createHarness()
  for (const socialTitleTemplate of [undefined, '']) {
    const markers = await studio.validate(settings({socialTitleTemplate}))
    assert.equal(errorsAt(markers, 'socialTitleTemplate').length, 1, `${socialTitleTemplate}`)
  }
})

test('a title template holds up to 200 characters, counted as Unicode code points', async () => {
  const studio = createHarness()
  // 🙏 is outside the BMP. It's one code point, which is how the contract counts a character,
  // and two UTF-16 units, which is how Sanity's max() counts.
  for (const character of ['x', '🙏']) {
    const template = (length: number) => `{title} ${character.repeat(length - 8)}`
    assert.equal([...template(200)].length, 200)
    const at = await studio.validate(settings({socialTitleTemplate: template(200)}))
    assert.deepEqual(errorsAt(at, 'socialTitleTemplate'), [], `200 with ${character}`)
    const over = await studio.validate(settings({socialTitleTemplate: template(201)}))
    assert.equal(errorsAt(over, 'socialTitleTemplate').length, 1, `201 with ${character}`)
  }
})

test('the default title template and the four placeholders are valid', async () => {
  const studio = createHarness()
  for (const socialTitleTemplate of [
    '{title}, {series}',
    '{title} | {speaker} | {date} | {series}',
    '{series}: {title}, {series}',
    'Sunday worship',
  ]) {
    const markers = await studio.validate(settings({socialTitleTemplate}))
    assert.deepEqual(errorsAt(markers, 'socialTitleTemplate'), [], socialTitleTemplate)
  }
})

test('a placeholder other than the four is an error that names it', async () => {
  const studio = createHarness()
  for (const [socialTitleTemplate, named] of [
    ['{titel}, {series}', ['{titel}']],
    ['{Title}', ['{Title}']],
    ['{ title }', ['{ title }']],
    ['{title}{}', ['{}']],
    ['{sermon} by {preacher}, {sermon}', ['{sermon}', '{preacher}']],
  ] as const) {
    const errors = errorsAt(
      await studio.validate(settings({socialTitleTemplate})),
      'socialTitleTemplate',
    )
    assert.equal(errors.length, 1, socialTitleTemplate)
    for (const placeholder of named) {
      assert.ok(
        errors[0].message.includes(placeholder),
        `${errors[0].message} names ${placeholder}`,
      )
    }
  }
})

test('a brace outside a placeholder is an error that names it', async () => {
  const studio = createHarness()
  const opening = /^A \{ has no closing \}\./
  const closing = /^A \} has no opening \{\./
  const both = /^A \{ or \} isn't part of a placeholder\./
  for (const [socialTitleTemplate, problem] of [
    ['{title', opening],
    ['{title}, {series', opening],
    ['Sermon { notes', opening],
    ['title}', closing],
    ['{title}}, {series}', closing],
    ['{{title}}', both],
    ['}{title}{', both],
  ] as const) {
    const errors = errorsAt(
      await studio.validate(settings({socialTitleTemplate})),
      'socialTitleTemplate',
    )
    assert.equal(errors.length, 1, socialTitleTemplate)
    assert.match(errors[0].message, problem, socialTitleTemplate)
  }
})

test('a description footer holds up to 1,000 UTF-8 bytes', async () => {
  const studio = createHarness()
  // é is 2 bytes, ✝ is 3 and 🙏 is 4, so each footer is 1,000 bytes in far fewer characters.
  const atLimit = [
    'a'.repeat(1000),
    'é'.repeat(500),
    `${'✝'.repeat(333)}a`,
    '🙏'.repeat(250),
    `Grace and peace 🙏 ${'é'.repeat(489)}.`,
  ]
  const overLimit = [...atLimit.map((footer) => `${footer}a`), `${'a'.repeat(997)}🙏`]
  const label = (footer: string) => `${footer.slice(0, 20)}..., ${Buffer.byteLength(footer)} bytes`
  for (const footer of atLimit) assert.equal(Buffer.byteLength(footer), 1000)
  for (const footer of overLimit) assert.equal(Buffer.byteLength(footer), 1001)

  for (const socialDescriptionFooter of atLimit) {
    const markers = await studio.validate(settings({socialDescriptionFooter}))
    assert.deepEqual(
      errorsAt(markers, 'socialDescriptionFooter'),
      [],
      label(socialDescriptionFooter),
    )
  }
  for (const socialDescriptionFooter of overLimit) {
    const markers = await studio.validate(settings({socialDescriptionFooter}))
    assert.equal(
      errorsAt(markers, 'socialDescriptionFooter').length,
      1,
      label(socialDescriptionFooter),
    )
  }
})

test('the media settings form starts with the default title template', async () => {
  const studio = createHarness()
  const {initialValue} = await studio.desk('media', 'mediaSettings')
  assert.deepEqual(initialValue, {
    _id: 'mediaSettings',
    _type: 'mediaSettings',
    socialTitleTemplate: '{title}, {series}',
  })
  assert.ok(initialValue)
  assert.deepEqual(errorsAt(await studio.validate(initialValue), 'socialTitleTemplate'), [])
})

const canonical = {_id: 'mediaSettings', _type: 'mediaSettings', socialTitleTemplate: '{title}'}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// What Studio's structure tool opens for an intent URL, as the review's probe of Sanity's own
// resolveIntent found: /tmp/review-t20-22-probes/intent.log.
test('Studio routes only the fixed ID to Media settings, and other intents to its plain editor', async () => {
  const studio = createHarness({documents: [canonical, {...canonical, _id: 'drafts.other'}]})

  const fixed = await studio.intent('edit', {id: 'mediaSettings', type: 'mediaSettings'})
  assert.deepEqual(fixed.path, ['media', 'mediaSettings'])
  assert.equal(fixed.documentId, 'mediaSettings')
  assert.equal(fixed.initialValue, undefined, 'the saved document opens, not the defaults')

  const other = await studio.intent('edit', {id: 'other', type: 'mediaSettings'})
  assert.deepEqual(other.path, ['__edit__other'])
  assert.equal(other.documentId, 'other')

  // A create intent gets a random ID before Studio routes it, so it never reaches the fixed
  // document, with or without the template.
  for (const params of [
    {type: 'mediaSettings'},
    {type: 'mediaSettings', template: 'mediaSettings'},
  ]) {
    const created = await studio.intent('create', params)
    assert.match(created.documentId, UUID)
    assert.deepEqual(created.path, [`__edit__${created.documentId}`])
    assert.equal(created.schemaType, 'mediaSettings')
    assert.equal(created.initialValue?.socialTitleTemplate, '{title}, {series}')
  }
})

test('a media settings document under any other ID is an error, in every version', async () => {
  const studio = createHarness({documents: [canonical]})
  for (const _id of ['other', 'drafts.other', 'versions.rSpring.other']) {
    const errors = errorsAt(await studio.validate({...canonical, _id}), '')
    assert.equal(errors.length, 1, _id)
    assert.match(errors[0].message, /Media settings in the Media section/, _id)
  }
  for (const _id of ['mediaSettings', 'drafts.mediaSettings', 'versions.rSpring.mediaSettings']) {
    assert.deepEqual(errorsAt(await studio.validate({...canonical, _id}), ''), [], _id)
  }
})

test('a media settings document under any other ID has no actions, in every version type', () => {
  const studio = createHarness()
  for (const versionType of [
    'draft',
    'published',
    'version',
    'scheduled-draft',
    'revision',
  ] as const) {
    for (const documentId of ['other', '0b6f3c2e-5d4a-4e8b-9f1c-2a7d6e5b4c3a']) {
      assert.deepEqual(
        studio.actions('mediaSettings', versionType, {documentId}),
        [],
        `${documentId} ${versionType}`,
      )
    }
  }
})
