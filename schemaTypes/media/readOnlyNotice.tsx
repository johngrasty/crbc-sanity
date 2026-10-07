import {Card, Stack, Text} from '@sanity/ui'
import type {ComponentType} from 'react'
import type {ObjectInputProps} from 'sanity'

// The document input for a read-only type: a notice, then the type's own input if it has one,
// else the usual read-only fields.
export function readOnlyNotice(notice: string, Input?: ComponentType<ObjectInputProps>) {
  function ReadOnlyNotice(props: ObjectInputProps) {
    return (
      <Stack space={4}>
        <Card padding={3} radius={2} border tone="caution">
          <Text size={1}>{notice}</Text>
        </Card>
        {Input ? <Input {...props} /> : props.renderDefault(props)}
      </Stack>
    )
  }
  return ReadOnlyNotice
}
