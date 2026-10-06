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

test('media settings has no template, so no create menu offers it', async () => {
  const studio = createHarness()
  await assert.rejects(studio.create('mediaSettings'), /No template named "mediaSettings"/)
})

test('a missing title template is an error', async () => {
  const studio = createHarness()
  for (const socialTitleTemplate of [undefined, '']) {
    const markers = await studio.validate(settings({socialTitleTemplate}))
    assert.equal(errorsAt(markers, 'socialTitleTemplate').length, 1, `${socialTitleTemplate}`)
  }
})

test('a title template holds up to 200 characters', async () => {
  const studio = createHarness()
  const template = (length: number) => `{title} ${'x'.repeat(length - 8)}`
  assert.equal(template(200).length, 200)
  const at = await studio.validate(settings({socialTitleTemplate: template(200)}))
  assert.deepEqual(errorsAt(at, 'socialTitleTemplate'), [])
  const over = await studio.validate(settings({socialTitleTemplate: template(201)}))
  assert.equal(errorsAt(over, 'socialTitleTemplate').length, 1)
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
