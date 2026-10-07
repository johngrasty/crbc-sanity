// The input for a service event's start. The editor enters a local date and time and a zone.
// The input resolves them as the editor types and stores the offset and UTC time only when the
// time has one reading. When the clocks go back it shows both readings with neither chosen, and
// when they skip ahead it shows an error.
//
// It takes part in Studio's focus handling as the default object input does. Studio's field ref
// focuses the date and time. Focusing a control reports its field, local, timeZone or offset, and
// leaving it reports a blur. When an editor picks a marker on one of the start's fields, Studio
// sets focusPath, and the input moves focus to that field's control.
import {Box, Card, Flex, Radio, Stack, Text, TextInput} from '@sanity/ui'
import {useEffect, useId, useImperativeHandle, useRef} from 'react'
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

export function ZonedStartInput(props: ObjectInputProps) {
  const {value, onChange, readOnly, focusPath, onPathFocus, elementProps} = props
  const start = (value ?? {}) as ZonedStart
  const local = start.local ?? ''
  const timeZone = start.timeZone ?? ''
  const name = useId()

  const localRef = useRef<HTMLInputElement>(null)
  const zoneRef = useRef<HTMLInputElement>(null)
  const choiceRefs = useRef<(HTMLInputElement | null)[]>([])

  // Studio focuses the field through this ref, for example from a marker on the start itself.
  useImperativeHandle(elementProps.ref, () => localRef.current, [])

  // The UTC time has no control of its own, and entering the time again fixes it, so its marker
  // goes to the date and time. An offset marker goes to the chosen reading, else the first.
  const target = focusPath[0]
  useEffect(() => {
    const choices = choiceRefs.current.filter((choice) => choice !== null)
    const element =
      target === 'timeZone'
        ? zoneRef.current
        : target === 'offset'
          ? (choices.find((choice) => choice.checked) ?? choices[0] ?? localRef.current)
          : target === 'local' || target === 'utc'
            ? localRef.current
            : null
    if (element && element.ownerDocument.activeElement !== element) element.focus()
  }, [target])

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
            ref={localRef}
            id={elementProps.id}
            type="datetime-local"
            aria-label="Date and time"
            aria-describedby={elementProps['aria-describedby']}
            value={local}
            readOnly={readOnly}
            onChange={(event) => save(storedStart(event.currentTarget.value, timeZone))}
            onFocus={() => onPathFocus(['local'])}
            onBlur={elementProps.onBlur}
          />
        </Box>
        <Box flex={1} style={{minWidth: 200}}>
          <TextInput
            ref={zoneRef}
            aria-label="Time zone"
            placeholder="America/New_York"
            value={timeZone}
            readOnly={readOnly}
            onChange={(event) => save(storedStart(local, event.currentTarget.value.trim()))}
            onFocus={() => onPathFocus(['timeZone'])}
            onBlur={elementProps.onBlur}
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
                  ref={(element) => {
                    choiceRefs.current[index] = element
                  }}
                  name={name}
                  checked={start.offset === reading.offset}
                  disabled={readOnly}
                  onChange={() => save(storedStart(local, timeZone, reading.offset))}
                  onFocus={() => onPathFocus(['offset'])}
                  onBlur={elementProps.onBlur}
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
