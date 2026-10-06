import {defineArrayMember, defineField} from 'sanity'
import {labelLimit} from './limits'
import {itemLimit, noRepeats} from './lists'

// Every name a speaker or topic goes by. The website's search and browse match these as well as
// the name or label.
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
