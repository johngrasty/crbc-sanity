// The rule for every URL field in the editorial types: an http or https address of at most 2,048
// characters and 2,048 UTF-8 bytes (contract section 10.2). Every character takes at least one
// byte, so the byte limit covers the character limit too.
// validation: (rule) => urlRule(rule)
import type {Rule, UrlRule} from 'sanity'
import {utf8Bytes} from './bytes'
import {URL_MAX_LENGTH} from './limits'

const count = (value: number) => value.toLocaleString('en-US')

// Sanity builds each rule a url field returns from a base rule that already checks the scheme,
// with its own message. The length rule starts from a copy without that check, so a bad scheme
// gives one marker.
const withoutSchemeCheck = (rule: UrlRule) =>
  (rule as unknown as Rule).clone().reset() as unknown as UrlRule

export const urlRule = (rule: UrlRule) => [
  rule
    .uri({scheme: ['http', 'https']})
    .error('Use a web address that starts with http:// or https://.'),
  withoutSchemeCheck(rule).custom((value) => {
    const bytes = value ? utf8Bytes(value) : 0
    return bytes <= URL_MAX_LENGTH
      ? true
      : `This web address is too long. It has ${count(bytes)} bytes, and the limit is ${count(URL_MAX_LENGTH)}. Accented letters and symbols take two to four bytes each.`
  }),
]
