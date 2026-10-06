import {defineField, defineType} from 'sanity'
import {CalendarClock} from 'lucide-react'
import {isResourceId} from '../../media-contract/src/ids'
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
      description:
        'How long the service usually runs. Studio fills this in for a Sunday morning or Wednesday night start.',
      validation: (rule) => [
        rule.required().error('Enter how long the service runs, in minutes.'),
        rule.integer().error('Enter a whole number of minutes.'),
        rule.min(10).max(300).error('Enter a length from 10 to 300 minutes.'),
      ],
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
      description:
        'YouTube and Facebook open the live video this many minutes before the start. Most services use 5.',
      initialValue: 5,
      validation: (rule) => [
        rule.integer().error('Enter a whole number of minutes.'),
        rule.min(0).max(60).error('Enter a lead from 0 to 60 minutes.'),
      ],
      group: 'social',
    }),
    defineField({
      name: 'resourceId',
      title: 'Live stream',
      type: 'string',
      description:
        'The live stream media-ops uses for this service. Leave it as lr_main unless a developer asks you to change it.',
      initialValue: 'lr_main',
      validation: (rule) => [
        rule.required().error('Enter the live stream. Most services use lr_main.'),
        rule.custom((value) =>
          !value || isResourceId(value)
            ? true
            : 'Use a live stream ID such as lr_main, in lower-case letters, digits and underscores.',
        ),
      ],
      group: 'advanced',
    }),
  ],
})
