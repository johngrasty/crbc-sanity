// The rule for every URL field in the editorial types: an http or https address of at most 2,048
// characters and 2,048 UTF-8 bytes (contract section 10.2). The contract's Url has format uri,
// which allows only ASCII, so each character is one byte and the two limits are the same.
// validation: (rule) => urlRule(rule), or urlRule(rule, {required: true}) for a required URL.
import type {Rule, UrlRule} from 'sanity'
import {URL_MAX_LENGTH} from './limits'

const count = (value: number) => value.toLocaleString('en-US')

// The characters RFC 3986 allows in a URI, with % only as the start of an escape such as %C3%A9.
// Anything else, such as é or a space, a browser's address bar copies percent-encoded.
const uriCharacters = /^(?:[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=]|%[0-9A-Fa-f]{2})*$/

// Sanity builds each rule a url field returns from a base rule that already checks the scheme,
// with its own message. The other rules start from a copy without that check, so a bad scheme
// gives one marker.
const withoutSchemeCheck = (rule: UrlRule) =>
  (rule as unknown as Rule).clone().reset() as unknown as UrlRule

export const urlRule = (rule: UrlRule, {required = false}: {required?: boolean} = {}) => [
  ...(required ? [withoutSchemeCheck(rule).required()] : []),
  rule
    .uri({scheme: ['http', 'https']})
    .error('Use a web address that starts with http:// or https://.'),
  withoutSchemeCheck(rule).custom((value) =>
    !value || uriCharacters.test(value)
      ? true
      : "This web address has characters it can't hold, such as accented letters or spaces. Copy it from the browser's address bar, which writes é as %C3%A9 and a space as %20.",
  ),
  withoutSchemeCheck(rule).custom((value) => {
    const length = value ? [...value].length : 0
    return length <= URL_MAX_LENGTH
      ? true
      : `This web address is too long. It has ${count(length)} characters, and the limit is ${count(URL_MAX_LENGTH)}.`
  }),
]
