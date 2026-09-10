export function webUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      return undefined
    return url.href
  } catch {
    return undefined
  }
}

export function subsplashUrl(value: unknown): string | undefined {
  const href = webUrl(value)
  return href && new URL(href).origin === 'https://subsplash.com' ? href : undefined
}

// Only extract a provider URL. Never evaluate any part of the legacy HTML.
export function subsplashEmbedUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const script = value.match(/subsplashEmbed\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/)
  const iframe = value.match(/<iframe\b[^>]*\bsrc=["']([^"']+)["']/i)
  try {
    const href = script
      ? new URL(script[1], script[2]).href
      : (iframe?.[1] || value).replaceAll('&amp;', '&')
    const valid = subsplashUrl(href)
    if (!valid) return undefined
    const url = new URL(valid)
    url.searchParams.set('embed', 'true')
    return url.href
  } catch {
    return undefined
  }
}

export function newsletterArchiveUrl(value: unknown): string | undefined {
  const href = webUrl(value)
  if (!href) return undefined
  const url = new URL(href)
  if (
    url.protocol !== 'https:' ||
    url.port ||
    !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.list-manage\.com$/i.test(url.hostname) ||
    url.pathname !== '/generate-js/' ||
    !/^[a-f0-9]+$/i.test(url.searchParams.get('u') || '') ||
    !/^\d+$/.test(url.searchParams.get('fid') || '')
  )
    return undefined
  // Keep only the provider's archive parameters, never arbitrary script attributes.
  const normalized = new URL(url.origin + '/generate-js/')
  normalized.searchParams.set('u', url.searchParams.get('u')!)
  normalized.searchParams.set('fid', url.searchParams.get('fid')!)
  const show = Number(url.searchParams.get('show') || 10)
  if (!Number.isInteger(show) || show < 1 || show > 100) return undefined
  normalized.searchParams.set('show', String(show))
  return normalized.href
}
