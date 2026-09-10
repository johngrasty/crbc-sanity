export const navigationUriOptions = {
  allowRelative: true,
  scheme: ['http', 'https', 'mailto', 'tel', 'sms'],
}

export function validateNavigationLink(value: unknown): true | string {
  if (value == null || value === '') return true
  if (typeof value !== 'string' || /[\s\\\u0000-\u001f\u007f]/.test(value))
    return 'Use a URL without spaces or backslashes'
  if (value.startsWith('//')) return 'Start website links with https:// or a single /'
  if (/^[/#?]/.test(value)) return true
  try {
    const url = new URL(value)
    if (
      ['http:', 'https:', 'mailto:', 'tel:', 'sms:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
      return true
  } catch {
    /* Return the editor guidance below. */
  }
  return 'Use a path such as /about, an anchor such as #contact, or an http, https, mailto, tel or sms URL'
}
