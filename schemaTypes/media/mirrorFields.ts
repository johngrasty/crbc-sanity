// Fields both mirror types carry (contract sections 3 and 9.8).
import {defineField} from 'sanity'

export const environments = [
  {title: 'Dev', value: 'dev'},
  {title: 'Staging', value: 'staging'},
  {title: 'Production', value: 'production'},
]

export const environmentField = defineField({
  name: 'environment',
  title: 'Environment',
  type: 'string',
  options: {list: environments},
})

// The projection fence. media-ops compares the pair, generation first, so an older write
// never replaces a newer one.
export const mirrorFenceFields = [
  defineField({name: 'mirrorGen', title: 'Mirror generation', type: 'number'}),
  defineField({name: 'mirrorSeq', title: 'Mirror sequence', type: 'number'}),
]
