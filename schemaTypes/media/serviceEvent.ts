import {defineField, defineType} from 'sanity'
import {CalendarClock} from 'lucide-react'
import {editorialIdField} from './editorialId'
import {CHURCH_TIME_ZONE} from './timeZone'

// A service media-ops arms and streams. media-ops reads scheduledStart.utc as the start.
export default defineType({
  name: 'serviceEvent',
  title: 'Service event',
  type: 'document',
  icon: CalendarClock,
  groups: [
    {name: 'details', title: 'Details', default: true},
    {name: 'social', title: 'YouTube and Facebook'},
    {name: 'advanced', title: 'Advanced'},
  ],
  fields: [
    {...editorialIdField('serviceEvent'), group: 'details'},
    defineField({
      name: 'mediaItem',
      title: 'Media item',
      type: 'reference',
      to: [{type: 'mediaItem'}],
      description:
        'The media item the recording goes into. You can pick an item that is still a draft, but publish the item before you publish this event.',
      validation: (rule) => rule.required().error('Pick the media item the recording goes into.'),
      group: 'details',
    }),
    defineField({
      name: 'scheduledStart',
      title: 'Start',
      type: 'object',
      fields: [
        defineField({name: 'local', title: 'Date and time', type: 'string'}),
        defineField({name: 'timeZone', title: 'Time zone', type: 'string'}),
        defineField({name: 'offset', title: 'UTC offset', type: 'string'}),
        defineField({name: 'utc', title: 'UTC time', type: 'string'}),
      ],
      initialValue: {timeZone: CHURCH_TIME_ZONE},
      group: 'details',
    }),
    defineField({
      name: 'expectedDurationMinutes',
      title: 'Expected length in minutes',
      type: 'number',
      group: 'details',
    }),
    defineField({
      name: 'cancelled',
      title: 'Cancelled',
      type: 'boolean',
      initialValue: false,
      group: 'details',
    }),
    defineField({
      name: 'socialGoLiveLeadMinutes',
      title: 'Go live on YouTube and Facebook this many minutes early',
      type: 'number',
      initialValue: 5,
      group: 'social',
    }),
    defineField({
      name: 'resourceId',
      title: 'Live stream',
      type: 'string',
      initialValue: 'lr_main',
      group: 'advanced',
    }),
  ],
})
