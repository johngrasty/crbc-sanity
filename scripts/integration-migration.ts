import {
  newsletterArchiveUrl,
  subsplashEmbedUrl,
  subsplashUrl,
  webUrl,
} from '../lib/integration-urls.ts'

export type IntegrationDocument = {
  _id: string
  _type: string
  _rev: string
  [key: string]: unknown
}

export function integrationPatch(doc: IntegrationDocument) {
  const set: Record<string, unknown> = {}
  const object = (key: string) => (doc[key] || {}) as Record<string, unknown>
  const add = (path: string, current: unknown, value: string | undefined) => {
    if (current !== undefined && current !== null) return
    if (!value) throw new Error(`${doc._id}.${path}: cannot extract a valid URL`)
    set[path] = value
  }
  const embed = (key: string) => {
    const section = object(key)
    if (section.embedUrl != null) {
      if (!subsplashUrl(section.embedUrl)) throw new Error(`${doc._id}.${key}.embedUrl is invalid`)
    } else if (section.subsplashEmbedCode) {
      add(`${key}.embedUrl`, section.embedUrl, subsplashEmbedUrl(section.subsplashEmbedCode))
    } else if (key === 'onlineGiving') {
      throw new Error(`${doc._id}.onlineGiving has no giving URL or legacy embed`)
    }
  }
  if (doc._type === 'givingPage') {
    embed('onlineGiving')
    add(
      'onlineGiving.directGivingUrl',
      object('onlineGiving').directGivingUrl,
      'https://subsplash.com/u/-4NHTGK/give',
    )
  }
  if (doc._type === 'watchPage') {
    embed('liveStream')
    embed('archive')
  }
  if (doc._type === 'settings') {
    const integrations = object('integrations')
    const signup = integrations.newsletterSignupUrl ?? 'http://eepurl.com/i1IYM-/'
    const archive =
      integrations.newsletterArchiveEmbedUrl ??
      'https://mycalvaryroad.us10.list-manage.com/generate-js/?u=bb740c6cd32cfa3662ab6e231&show=10&fid=32236'
    if (!webUrl(signup) || !newsletterArchiveUrl(archive))
      throw new Error(`${doc._id}: invalid newsletter URL`)
    if (!doc.integrations)
      set.integrations = {
        _type: 'object',
        newsletterSignupUrl: signup,
        newsletterArchiveEmbedUrl: archive,
      }
    else {
      add('integrations.newsletterSignupUrl', integrations.newsletterSignupUrl, webUrl(signup))
      add(
        'integrations.newsletterArchiveEmbedUrl',
        integrations.newsletterArchiveEmbedUrl,
        newsletterArchiveUrl(archive),
      )
    }
  }
  if (['lifeGroupsPage', 'communityGroupsPage'].includes(doc._type)) {
    if (doc.pcoGroupTypeName == null)
      set.pcoGroupTypeName =
        doc._type === 'lifeGroupsPage' ? 'Sunday School Classes' : 'Community Groups'
  }
  return set
}
