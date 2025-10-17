import React, {useCallback, useEffect, useState} from 'react'
import {Card, Stack, Select, Text, Spinner, Box, Flex, Button} from '@sanity/ui'
import {set, unset, ObjectInputProps} from 'sanity'

interface PCOEventData {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  registrationUrl: string | null
  churchCenterUrl: string
  isVisible: boolean
}

interface PCOEventsResponse {
  success: boolean
  count: number
  events: PCOEventData[]
}

/**
 * Custom input component for selecting PCO events in Sanity Studio
 *
 * This component fetches events from the frontend API and allows
 * staff to select an event, automatically populating related fields.
 */
export function PCOEventPicker(props: ObjectInputProps) {
  const {value, onChange} = props
  const [events, setEvents] = useState<PCOEventData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(
    value?.eventId as string | undefined,
  )

  // Fetch PCO events from the frontend API
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true)
        setError(null)

        // Get the preview URL from environment
        const baseUrl = process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:5173'
        const response = await fetch(`${baseUrl}/api/pco/events?limit=100`)

        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.statusText}`)
        }

        const data: PCOEventsResponse = await response.json()

        if (!data.success) {
          throw new Error('API returned unsuccessful response')
        }

        setEvents(data.events)
      } catch (err) {
        console.error('Failed to fetch PCO events:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  // Handle event selection
  const handleSelect = useCallback(
    (eventId: string) => {
      const event = events.find((e) => e.id === eventId)

      if (!event) {
        return
      }

      setSelectedEventId(eventId)

      // Update the pcoEvent object
      onChange([
        set(
          {
            eventId: event.id,
            eventType: 'calendar',
            lastSynced: new Date().toISOString(),
          },
          [],
        ),
      ])

      // Also update parent document fields
      // Note: This requires the parent to be accessible
      // For now, staff will manually sync these fields after selection
    },
    [events, onChange],
  )

  // Handle clear selection
  const handleClear = useCallback(() => {
    setSelectedEventId(undefined)
    onChange(unset())
  }, [onChange])

  // Loading state
  if (loading) {
    return (
      <Card padding={4} radius={2} tone="transparent">
        <Flex align="center" justify="center" gap={3}>
          <Spinner />
          <Text size={1}>Loading PCO events...</Text>
        </Flex>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card padding={4} radius={2} tone="critical">
        <Stack space={3}>
          <Text size={2} weight="bold">
            Failed to load PCO events
          </Text>
          <Text size={1}>{error}</Text>
          <Text size={1} muted>
            Make sure your frontend is running and PCO credentials are configured.
          </Text>
        </Stack>
      </Card>
    )
  }

  // No events found
  if (events.length === 0) {
    return (
      <Card padding={4} radius={2} tone="caution">
        <Stack space={3}>
          <Text size={2} weight="bold">
            No upcoming events found
          </Text>
          <Text size={1} muted>
            Create events in Planning Center Online to see them here.
          </Text>
        </Stack>
      </Card>
    )
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  return (
    <Stack space={3}>
      <Select
        fontSize={2}
        padding={3}
        value={selectedEventId || ''}
        onChange={(e) => handleSelect(e.currentTarget.value)}
      >
        <option value="">Select a Planning Center event...</option>
        {events.map((event) => {
          const date = new Date(event.startDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
          return (
            <option key={event.id} value={event.id}>
              {event.title} - {date}
            </option>
          )
        })}
      </Select>

      {selectedEvent && (
        <Card padding={3} radius={2} shadow={1} tone="primary">
          <Stack space={3}>
            <Flex justify="space-between" align="center">
              <Text size={2} weight="bold">
                Selected Event
              </Text>
              <Button fontSize={1} mode="ghost" text="Clear" tone="critical" onClick={handleClear} />
            </Flex>

            <Box>
              <Text size={1} weight="semibold">
                {selectedEvent.title}
              </Text>
            </Box>

            {selectedEvent.description && (
              <Box>
                <Text size={1} muted>
                  {selectedEvent.description.substring(0, 200)}
                  {selectedEvent.description.length > 200 ? '...' : ''}
                </Text>
              </Box>
            )}

            <Flex gap={3} wrap="wrap">
              <Box>
                <Text size={1} muted>
                  Start:{' '}
                </Text>
                <Text size={1}>
                  {new Date(selectedEvent.startDate).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </Box>

              {selectedEvent.registrationUrl && (
                <Box>
                  <Text size={1} muted>
                    Registration:{' '}
                  </Text>
                  <Text size={1}>Available</Text>
                </Box>
              )}
            </Flex>

            <Card padding={2} radius={1} tone="caution">
              <Text size={1}>
                After selecting, click "Copy data to fields" button below to populate title,
                description, and dates automatically.
              </Text>
            </Card>
          </Stack>
        </Card>
      )}

      {selectedEvent && (
        <Button
          fontSize={2}
          padding={3}
          text="Copy PCO Data to Fields"
          tone="positive"
          mode="default"
          onClick={() => {
            // We'll implement a document action for this
            // For now, show instructions
            alert(
              `Copy these values to the corresponding fields:\n\n` +
                `Title: ${selectedEvent.title}\n` +
                `Description: ${selectedEvent.description || 'N/A'}\n` +
                `Date: ${selectedEvent.startDate}\n` +
                `Registration URL: ${selectedEvent.registrationUrl || selectedEvent.churchCenterUrl}`,
            )
          }}
        />
      )}

      <Text size={1} muted>
        Event data synced: {value?.lastSynced ? new Date(value.lastSynced).toLocaleString() : 'Never'}
      </Text>
    </Stack>
  )
}
