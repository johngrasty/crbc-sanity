import {Card, Stack, Text} from '@sanity/ui'
import type {InputProps} from 'sanity'

// The document input for a read-only type: a notice, then the usual read-only fields.
export function readOnlyNotice(notice: string) {
  function ReadOnlyNotice(props: InputProps) {
    return (
      <Stack space={4}>
        <Card padding={3} radius={2} border tone="caution">
          <Text size={1}>{notice}</Text>
        </Card>
        {props.renderDefault(props)}
      </Stack>
    )
  }
  return ReadOnlyNotice
}
