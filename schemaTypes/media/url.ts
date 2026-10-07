// The rule for every URL field in the editorial types: an http or https address, written as RFC
// 3986 allows, in ASCII, of at most 2,048 characters and 2,048 UTF-8 bytes (contract section
// 10.2). The contract's Url has format uri, which allows only ASCII, so each character is one byte
// and the two limits are the same. Every URL this rule accepts also passes the contract's check.
// validation: (rule) => urlRule(rule), or urlRule(rule, {required: true}) for a required URL.
import type {Rule, UrlRule} from 'sanity'
import {URL_MAX_LENGTH} from './limits'

const count = (value: number) => value.toLocaleString('en-US')

// The grammar of an http or https URI, from RFC 3986 section 3 and appendix A. An http URI always
// has an authority with a host (RFC 9110 section 4.2.1). Square brackets appear only around an
// IPv6 host, a # starts the fragment and can't appear in it, and % starts a two-digit escape.
const hex = '[0-9A-Fa-f]'
const pctEncoded = `%${hex}{2}`
const unreserved = 'A-Za-z0-9\\-._~'
const subDelims = "!$&'()*+,;="
const h16 = `${hex}{1,4}`
const decOctet = '(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])'
const ipv4 = `${decOctet}(?:\\.${decOctet}){3}`
const ls32 = `(?:${h16}:${h16}|${ipv4})`
// [ *n( h16 ":" ) h16 ], the groups before a "::".
const before = (n: number) => `(?:(?:${h16}:){0,${n}}${h16})?`
const ipv6 = [
  `(?:${h16}:){6}${ls32}`,
  `::(?:${h16}:){5}${ls32}`,
  `${before(0)}::(?:${h16}:){4}${ls32}`,
  `${before(1)}::(?:${h16}:){3}${ls32}`,
  `${before(2)}::(?:${h16}:){2}${ls32}`,
  `${before(3)}::${h16}:${ls32}`,
  `${before(4)}::${ls32}`,
  `${before(5)}::${h16}`,
  `${before(6)}::`,
]
  .map((form) => `(?:${form})`)
  .join('|')
const userinfo = `(?:[${unreserved}${subDelims}:]|${pctEncoded})*`
const regName = `(?:[${unreserved}${subDelims}]|${pctEncoded})+`
const host = `(?:\\[(?:${ipv6})\\]|${regName})`
const pchar = `(?:[${unreserved}${subDelims}:@]|${pctEncoded})`
const httpUri = new RegExp(
  `^https?://(?:${userinfo}@)?${host}(?::[0-9]*)?(?:/${pchar}*)*` +
    `(?:\\?(?:${pchar}|[/?])*)?(?:#(?:${pchar}|[/?])*)?$`,
  'i',
)

// A character a URI can hold only percent-encoded: anything outside ASCII, a control character,
// a space, or one of " < > \ ^ ` { | }.
const needsEncoding = /[^A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]/u

// The one problem to show for a URL, in this order: the scheme, the URI syntax, characters that
// need encoding, then the length. The syntax check reads each character that needs encoding as a
// plain letter, so an editor hears about encoding once the address's structure is right.
function urlProblem(url: string): string | undefined {
  if (!/^https?:\/\//i.test(url)) return 'Use a web address that starts with http:// or https://.'
  if (!httpUri.test(url.replace(new RegExp(needsEncoding.source, 'gu'), 'a'))) {
    return "This isn't a valid web address. Write a second # as %23, a % on its own as %25, and square brackets as %5B and %5D, except around an IPv6 address. Copying the address from the browser's address bar usually fixes this."
  }
  if (needsEncoding.test(url)) {
    return "This web address has characters it can't hold, such as accented letters or spaces. Copy it from the browser's address bar, which writes é as %C3%A9 and a space as %20."
  }
  if (url.length > URL_MAX_LENGTH) {
    return `This web address is too long. It has ${count(url.length)} characters, and the limit is ${count(URL_MAX_LENGTH)}.`
  }
  return undefined
}

// Sanity builds each rule a url field returns from a base rule that already runs its own URI
// check, with its own message, and it rejects a user name and password. The URL rule starts from
// a copy without it.
const withoutUriCheck = (rule: UrlRule) =>
  (rule as unknown as Rule).clone().reset() as unknown as UrlRule

// One rule, so a URL gets one error. A missing required URL gets Sanity's "Required", and the
// custom check skips an empty value.
export function urlRule(rule: UrlRule, {required = false}: {required?: boolean} = {}) {
  const base = withoutUriCheck(rule)
  return (required ? base.required() : base).custom((value) =>
    typeof value !== 'string' || !value ? true : (urlProblem(value) ?? true),
  )
}
