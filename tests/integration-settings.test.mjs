import {URL} from 'node:url'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {integrationPatch} from '../scripts/integration-migration.ts'
import {jobOrderPatches} from '../scripts/job-order-migration.ts'
import {validateNavigationLink} from '../lib/navigation-link.ts'
import {subsplashUrl, newsletterArchiveUrl} from '../lib/integration-urls.ts'

test('embed migration keeps giving options, preserves editor values, and rejects invalid providers', () => {
  const doc = {
    _id: 'givingPage',
    _type: 'givingPage',
    _rev: 'fixture',
    onlineGiving: {
      subsplashEmbedCode:
        '<script>subsplashEmbed("u/example/give?fund_id=fixture&frequency=once", "https://subsplash.com")</script>',
    },
  }
  const patch = integrationPatch(doc)
  const url = new URL(patch['onlineGiving.embedUrl'])
  assert.equal(url.searchParams.get('fund_id'), 'fixture')
  assert.equal(url.searchParams.get('frequency'), 'once')
  assert.equal(url.searchParams.get('embed'), 'true')
  assert.ok(doc.onlineGiving.subsplashEmbedCode)
  assert.deepEqual(
    integrationPatch({
      ...doc,
      onlineGiving: {
        ...doc.onlineGiving,
        embedUrl: patch['onlineGiving.embedUrl'],
        directGivingUrl: 'https://subsplash.com/u/edited/give',
      },
    }),
    {},
  )
  assert.throws(
    () =>
      integrationPatch({
        ...doc,
        onlineGiving: {subsplashEmbedCode: '<iframe src="https://evil.example/give"></iframe>'},
      }),
    /cannot extract/,
  )
})

test('newsletter and group migrations are additive and safe to rerun on drafts', () => {
  const doc = {_id: 'drafts.settings', _type: 'settings', _rev: 'fixture'}
  const patch = integrationPatch(doc)
  assert.deepEqual(integrationPatch({...doc, ...patch}), {})
  const group = {
    _id: 'lifeGroupsPage',
    _type: 'lifeGroupsPage',
    _rev: 'fixture',
    pcoGroupTypeName: 'Adult Classes',
  }
  assert.deepEqual(integrationPatch(group), {})
})

test('provider and navigation validation reject executable and lookalike URLs', () => {
  for (const url of [
    'javascript:alert(1)',
    'https://subsplash.com.evil.example/x',
    'https://user:password@subsplash.com/x',
  ])
    assert.equal(subsplashUrl(url), undefined)
  for (const url of [
    'https://example.org/generate-js/?u=abc&fid=1',
    'https://example.list-manage.com/other?u=abc&fid=1',
    'https://example.list-manage.com/generate-js/?u=abc&fid=1%22%3E',
  ])
    assert.equal(newsletterArchiveUrl(url), undefined)
  for (const url of [
    '/about',
    '#contact',
    'https://example.org',
    'mailto:office@example.org',
    'tel:+15555550123',
    'sms:+15555550123',
  ])
    assert.equal(validateNavigationLink(url), true)
  for (const url of ['about', '//evil.example', 'javascript:alert(1)', '/\\evil.example'])
    assert.equal(typeof validateNavigationLink(url), 'string')
})

test('job rank migration preserves the prior order and pairs draft versions', () => {
  const docs = [
    {_id: 'b', _rev: '1', displayOrder: 20},
    {_id: 'a', _rev: '2', displayOrder: 10},
    {_id: 'drafts.a', _rev: '3', displayOrder: 10},
  ]
  const patches = jobOrderPatches(docs)
  const rank = (id) => patches.find(({doc}) => doc._id === id).orderRank
  assert.ok(rank('a') < rank('b'))
  assert.equal(rank('a'), rank('drafts.a'))
  assert.deepEqual(jobOrderPatches(patches.map(({doc, orderRank}) => ({...doc, orderRank}))), [])
  assert.throws(
    () => jobOrderPatches([{...docs[0], orderRank: rank('b')}, docs[1]]),
    /partially populated/,
  )
})
