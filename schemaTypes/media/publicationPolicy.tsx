// A media item's publication policy (contract section 3). media-ops records it at arming, and
// manual adds an approval step before the recording publishes (section 8.1).
import {Flex, Radio, Stack, Text} from '@sanity/ui'
import {defineField, set, type StringInputProps} from 'sanity'

const policies = [
  {
    title: 'Automatic',
    value: 'auto',
    description: 'The recording publishes once it passes the checks.',
  },
  {
    title: 'Manual',
    value: 'manual',
    description: 'The recording waits until an editor approves it in media-ops.',
  },
]

// Sanity's radio list shows only each value's title, so this input adds what the value does.
// Like Sanity's own radio input, it gives the first choice the ref Studio focuses the field
// through, for example when an editor selects the field's Required marker.
function PublicationPolicyInput({value, onChange, readOnly, elementProps}: StringInputProps) {
  return (
    <Stack space={3} role="radiogroup">
      {policies.map((policy, index) => (
        <Flex key={policy.value} as="label" gap={3} align="flex-start">
          <Radio
            ref={index === 0 ? elementProps.ref : undefined}
            name={elementProps.id}
            value={policy.value}
            checked={value === policy.value}
            disabled={readOnly}
            onChange={() => onChange(set(policy.value))}
            onFocus={elementProps.onFocus}
            onBlur={elementProps.onBlur}
          />
          <Stack space={2}>
            <Text size={1} weight="medium">
              {policy.title}
            </Text>
            <Text size={1} muted>
              {policy.description}
            </Text>
          </Stack>
        </Flex>
      ))}
    </Stack>
  )
}

export const publicationPolicyField = defineField({
  name: 'publicationPolicy',
  title: 'Publication policy',
  type: 'string',
  description: 'How the recording goes public after the service.',
  options: {list: policies.map(({title, value}) => ({title, value})), layout: 'radio'},
  initialValue: 'auto',
  validation: (rule) => rule.required(),
  components: {input: PublicationPolicyInput},
})
