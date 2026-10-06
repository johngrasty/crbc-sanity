// The input for a service event's start. The editor enters a local date and time and a zone.
// The input resolves them as the editor types and stores the offset and UTC time only when the
// time has one reading. When the clocks go back it shows both readings with neither chosen, and
// when they skip ahead it shows an error.
import {Box, Card, Flex, Radio, Stack, Text, TextInput} from '@sanity/ui'
import {useId} from 'react'
import {set, unset, type ObjectInputProps} from 'sanity'
import {
  resolveWallTime,
  startMessages,
  startProblems,
  storedStart,
  type ZonedInstant,
  type ZonedStart,
} from './zonedStart'

// One reading of a time that happens twice, such as "1:30 AM EDT, the first time".
function readingLabel({utc}: ZonedInstant, timeZone: string, index: number) {
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(Date.parse(utc))
  return `${time}, the ${index === 0 ? 'first' : 'second'} time`
}

const utcLabel = (utc: string) =>
  new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short'})
    .format(Date.parse(utc))
    .concat(' UTC')

export function ZonedStartInput({value, onChange, readOnly}: ObjectInputProps) {
  const start = (value ?? {}) as ZonedStart
  const local = start.local ?? ''
  const timeZone = start.timeZone ?? ''
  const name = useId()

  const save = (next: ZonedStart) => onChange(Object.keys(next).length ? set(next) : unset())

  const problems = startProblems(start)
  const readings = problems.local || problems.timeZone ? [] : resolveWallTime(local, timeZone)
  const twice = readings.length === 2
  // The caution card already says the time happens twice.
  const errors = [
    problems.local === startMessages.missing ? undefined : problems.local,
    problems.timeZone,
    twice && !start.offset ? undefined : problems.offset,
    problems.utc,
  ].filter(Boolean)

  return (
    <Stack space={3}>
      <Flex gap={2} wrap="wrap">
        <Box flex={1} style={{minWidth: 200}}>
          <TextInput
            type="datetime-local"
            aria-label="Date and time"
            value={local}
            readOnly={readOnly}
            onChange={(event) => save(storedStart(event.currentTarget.value, timeZone))}
          />
        </Box>
        <Box flex={1} style={{minWidth: 200}}>
          <TextInput
            aria-label="Time zone"
            placeholder="America/New_York"
            value={timeZone}
            readOnly={readOnly}
            onChange={(event) => save(storedStart(local, event.currentTarget.value.trim()))}
          />
        </Box>
      </Flex>
      {twice && (
        <Card padding={3} radius={2} border tone="caution">
          <Stack space={3}>
            <Text size={1}>{startMessages.twice(timeZone)}</Text>
            {readings.map((reading, index) => (
              <Flex key={reading.offset} as="label" align="center" gap={2}>
                <Radio
                  name={name}
                  checked={start.offset === reading.offset}
                  disabled={readOnly}
                  onChange={() => save(storedStart(local, timeZone, reading.offset))}
                />
                <Text size={1}>{readingLabel(reading, timeZone, index)}</Text>
              </Flex>
            ))}
          </Stack>
        </Card>
      )}
      {errors.map((message) => (
        <Card key={message} padding={3} radius={2} border tone="critical">
          <Text size={1}>{message}</Text>
        </Card>
      ))}
      {start.utc && errors.length === 0 && (
        <Text size={1} muted>
          That&apos;s {utcLabel(start.utc)}.
        </Text>
      )}
    </Stack>
  )
}
