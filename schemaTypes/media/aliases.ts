import {defineArrayMember, defineField} from 'sanity'
import {labelLimit} from './limits'
import {itemLimit, noRepeats} from './lists'

// Other names a speaker or topic goes by. Studio's search matches them, and the website's search
// matches a speaker's aliases too (contract section 10.2).
export const aliasesField = (description: string) =>
  defineField({
    name: 'aliases',
    title: 'Aliases',
    type: 'array',
    description,
    of: [defineArrayMember({type: 'string', validation: (rule) => labelLimit(rule)})],
    options: {layout: 'tags'},
    validation: (rule) => [
      itemLimit(rule, 20, 'aliases'),
      // Search ignores case, so an alias that differs only in case adds nothing.
      noRepeats(
        rule,
        (alias) => (typeof alias === 'string' ? alias.trim().toLowerCase() : undefined),
        'This alias is already in the list.',
      ),
    ],
  })
