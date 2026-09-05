import assert from 'node:assert/strict'
import {test} from 'node:test'
import {URL} from 'node:url'
import {createDocumentPreviewUrl, documentSlug, singletonPaths} from '../structure/preview.ts'

function previewClient({fail = false} = {}) {
  const writes = []
  const client = {
    withConfig() {
      return client
    },
    patch() {
      return {set: (data) => data}
    },
    transaction() {
      return {
        createOrReplace(document) {
          writes.push(document)
          return this
        },
        patch(data) {
          writes.push(data)
          return this
        },
        async commit() {
          if (fail) throw new Error('Permission denied')
        },
      }
    },
    async delete() {
      return undefined
    },
  }
  return {client, writes}
}

test('preview links carry a fresh Sanity secret and preserve the complete slug', async () => {
  globalThis.window = {location: {origin: 'https://studio.example.test'}}
  for (const type of ['announcement', 'ministry', 'article', 'page']) {
    const {client, writes} = previewClient()
    const slug = 'nested/a & b?redirect=elsewhere'
    const url = new URL(
      await createDocumentPreviewUrl(client, {_type: type, slug: {current: slug}}),
    )
    assert.equal(url.pathname, '/api/preview')
    assert.equal(url.searchParams.get('type'), type)
    assert.equal(url.searchParams.get('slug'), slug)
    assert.equal(url.searchParams.get('sanity-preview-secret'), writes[1].secret)
    assert.ok(writes[1].secret.length >= 16)
    assert.equal(writes[0]._type, 'sanity.previewUrlSecret')
    assert.ok(writes[0]._id.startsWith('drafts.'))
  }
})

test('invalid documents cannot mint preview secrets', async () => {
  const {client, writes} = previewClient()
  for (const document of [{_type: 'article'}, {_type: 'settings', slug: {current: 'settings'}}]) {
    await assert.rejects(createDocumentPreviewUrl(client, document))
  }
  assert.deepEqual(writes, [])
  for (const document of [null, {}, {slug: 3}, {slug: {current: 3}}, {slug: {current: ''}}]) {
    assert.equal(documentSlug(document), undefined)
  }
})

test('failed Sanity authorization does not produce a preview URL', async () => {
  const {client} = previewClient({fail: true})
  await assert.rejects(
    createDocumentPreviewUrl(client, {_type: 'article', slug: {current: 'draft'}}),
    /Permission denied/,
  )
})

test('singleton links use the actual public website routes', () => {
  assert.equal(singletonPaths.beliefsPage, '/about/beliefs')
  assert.equal(singletonPaths.givingPage, '/give')
  assert.equal(singletonPaths.lifeGroupsPage, '/ministries/life-groups')
  assert.equal(singletonPaths.communityGroupsPage, '/ministries/community-groups')
})
