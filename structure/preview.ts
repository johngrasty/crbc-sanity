import {createPreviewSecret} from '@sanity/preview-url-secret/create-secret'
import type {SanityClient, SanityDocumentLike} from 'sanity'

export const previewableTypes = new Set(['announcement', 'ministry', 'article', 'page'])
export const previewOrigin = process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:5173'

export const singletonPaths: Record<string, string> = {
  homePage: '/',
  aboutPage: '/about',
  beliefsPage: '/about/beliefs',
  givingPage: '/give',
  visitPage: '/visit',
  connectPage: '/connect',
  servicesPage: '/services',
  watchPage: '/watch',
  calendarPage: '/calendar',
  lifeGroupsPage: '/ministries/life-groups',
  communityGroupsPage: '/ministries/community-groups',
}

export function documentSlug(document: SanityDocumentLike | null): string | undefined {
  const slug = document?.slug
  if (slug && typeof slug === 'object' && 'current' in slug && typeof slug.current === 'string') {
    return slug.current || undefined
  }
}

export async function createDocumentPreviewUrl(
  client: SanityClient,
  document: SanityDocumentLike,
): Promise<string> {
  const slug = documentSlug(document)
  if (!slug || !previewableTypes.has(document._type)) {
    throw new Error('Add a slug before previewing this document.')
  }
  const {secret} = await createPreviewSecret(client, 'crbc-studio', window.location.origin)
  const url = new URL('/api/preview', previewOrigin)
  url.searchParams.set('type', document._type)
  url.searchParams.set('slug', slug)
  url.searchParams.set('sanity-preview-secret', secret)
  return url.toString()
}
