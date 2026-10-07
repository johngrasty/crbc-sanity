import {defineArrayMember, defineField, defineType} from 'sanity'
import {Link2} from 'lucide-react'
import {environments} from './mirrorFields'
import {readOnlyType} from './readOnlyType'

// The environments allowed to write mirror documents into this dataset (contract sections 3
// and 9.8). An admin writes the one document, mediaOps.binding, by hand. media-ops reads it
// before its first mirror write and refuses to write when its environment isn't listed. The
// type name and field are proposed erratum S2.
export default readOnlyType(
  'An admin',
  defineType({
    name: 'mediaOpsBinding',
    title: 'Media ops binding',
    type: 'document',
    icon: Link2,
    fields: [
      defineField({
        name: 'environments',
        title: 'Environments',
        type: 'array',
        description: 'The media-ops environments that may write release and live status here.',
        // The list on the member gives the generated type its three values. Sanity checks a
        // value against a list only when the field has a validation function, so the member
        // has one that adds nothing else. A typo such as prod is then an error.
        of: [
          defineArrayMember({
            type: 'string',
            options: {list: environments},
            validation: (rule) => rule,
          }),
        ],
        // The list on the array shows the three as checkboxes.
        options: {list: environments},
      }),
    ],
    preview: {
      select: {environments: 'environments'},
      prepare: ({environments}) => ({
        title: 'Media ops binding',
        subtitle: Array.isArray(environments) ? environments.join(', ') : undefined,
      }),
    },
  }),
)
