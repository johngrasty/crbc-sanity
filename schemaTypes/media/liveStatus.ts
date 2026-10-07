import {defineField, defineType} from 'sanity'
import {Radio} from 'lucide-react'
import {environmentField, mirrorFenceFields} from './mirrorFields'
import {readOnlyType} from './readOnlyType'

// The event a live status points at, as section 10.3 of the contract shows it.
const liveEventField = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'object',
    fields: [
      defineField({name: 'eventId', title: 'Event ID', type: 'string'}),
      defineField({name: 'contentId', title: 'Content ID', type: 'string'}),
      defineField({name: 'title', title: 'Title', type: 'string'}),
      defineField({name: 'scheduledStart', title: 'Scheduled start', type: 'datetime'}),
      defineField({name: 'seriesTitle', title: 'Series title', type: 'string'}),
    ],
  })

const sessionStates = [
  'armed',
  'connecting',
  'live',
  'reconnecting',
  'interrupted',
  'ending',
  'ended',
  'abandoned',
  'cancelled',
]

// What the website shows for one live channel, as media-ops last projected it (contract
// sections 3 and 9.8). The fields follow the contract's SanityLiveStatus definition.
export default readOnlyType(
  'media-ops',
  defineType({
    name: 'liveStatus',
    title: 'Live status',
    type: 'document',
    icon: Radio,
    fields: [
      environmentField,
      defineField({name: 'channel', title: 'Channel', type: 'string'}),
      defineField({name: 'resourceId', title: 'Live resource ID', type: 'string'}),
      defineField({
        name: 'sessionState',
        title: 'Session state',
        type: 'string',
        options: {list: sessionStates},
      }),
      defineField({name: 'takenDown', title: 'Taken down', type: 'boolean'}),
      defineField({name: 'playableFrom', title: 'Playable from', type: 'datetime'}),
      defineField({name: 'endedAt', title: 'Ended', type: 'datetime'}),
      liveEventField('event', 'Event'),
      liveEventField('nextEvent', 'Next event'),
      defineField({
        name: 'playback',
        title: 'Playback',
        type: 'object',
        fields: [
          defineField({name: 'hls', title: 'HLS URL', type: 'url'}),
          defineField({name: 'hlsRoku', title: 'Roku HLS URL', type: 'url'}),
          defineField({name: 'expiresAt', title: 'Expires', type: 'datetime'}),
        ],
      }),
      defineField({name: 'observedAt', title: 'Observed', type: 'datetime'}),
      defineField({
        name: 'staleAfterSeconds',
        title: 'Stale after seconds',
        type: 'number',
        options: {list: [180, 2700]},
      }),
      ...mirrorFenceFields,
    ],
    preview: {
      select: {channel: 'channel', environment: 'environment', sessionState: 'sessionState'},
      prepare: ({channel, environment, sessionState}) => ({
        title: channel,
        subtitle: [environment, sessionState].filter(Boolean).join(', '),
      }),
    },
  }),
)
