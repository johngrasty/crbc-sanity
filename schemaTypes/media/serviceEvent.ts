import {defineArrayMember, defineField, defineType} from 'sanity'
import {CalendarClock} from 'lucide-react'
import {isResourceId} from '../../media-contract/src/ids'
import {editorialIdField} from './editorialId'
import {CHURCH_TIME_ZONE} from './timeZone'
import {startMessages, startProblems, type ZonedStart} from './zonedStart'

const platforms = [
  {title: 'YouTube', value: 'youtube'},
  {title: 'Facebook', value: 'facebook'},
]

const visibilities = [
  {title: 'Public', value: 'public'},
  {title: 'Unlisted', value: 'unlisted'},
  {title: 'Private', value: 'private'},
]

const titleOf = (list: {title: string; value: string}[], value: unknown) =>
  list.find((option) => option.value === value)?.title

type Destination = {_key: string; platform?: string; accountLabel?: string}

// The start a scheduledStart field's rule belongs to.
const startOf = (context: {parent?: unknown}) => context.parent as ZonedStart | undefined

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
      description:
        'The local date and time the service starts, in the time zone it takes place in.',
      fields: [
        defineField({
          name: 'local',
          title: 'Date and time',
          type: 'string',
          validation: (rule) => [
            rule.required().error(startMessages.missing),
            rule.custom((local, context) =>
              local ? (startProblems(startOf(context)).local ?? true) : true,
            ),
          ],
        }),
        defineField({
          name: 'timeZone',
          title: 'Time zone',
          type: 'string',
          validation: (rule) => [
            rule.required().error(startMessages.zoneMissing),
            rule.custom((timeZone, context) =>
              timeZone ? (startProblems(startOf(context)).timeZone ?? true) : true,
            ),
          ],
        }),
        // Studio sets the offset and UTC time from the local time and zone. A start in a gap,
        // or one that happens twice before the editor chooses, has neither.
        defineField({
          name: 'offset',
          title: 'UTC offset',
          type: 'string',
          validation: (rule) =>
            rule.custom((_, context) => startProblems(startOf(context)).offset ?? true),
        }),
        defineField({
          name: 'utc',
          title: 'UTC time',
          type: 'string',
          validation: (rule) =>
            rule.custom((_, context) => startProblems(startOf(context)).utc ?? true),
        }),
      ],
      initialValue: {timeZone: CHURCH_TIME_ZONE},
      // required() here would make Sanity also run the field rules on a missing start, and
      // repeat this message there.
      validation: (rule) => rule.custom((start) => (start ? true : startMessages.missing)),
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
      name: 'requestedDestinations',
      title: 'YouTube and Facebook',
      type: 'array',
      description:
        'The accounts media-ops streams the service to, as well as the website. Add one for each account.',
      of: [
        defineArrayMember({
          name: 'requestedDestination',
          title: 'Destination',
          type: 'object',
          fields: [
            defineField({
              name: 'platform',
              title: 'Platform',
              type: 'string',
              options: {list: platforms, layout: 'radio', direction: 'horizontal'},
              validation: (rule) => rule.required().error('Pick YouTube or Facebook.'),
            }),
            defineField({
              name: 'accountLabel',
              title: 'Account',
              type: 'string',
              description: 'The account name exactly as media-ops lists it, such as CRBC YouTube.',
              validation: (rule) => [
                rule.required().error('Enter the account name.'),
                rule.max(200),
              ],
            }),
            defineField({
              name: 'visibility',
              title: 'Who can see it',
              type: 'string',
              description:
                "Public tells the church's followers. Use unlisted or private for a rehearsal.",
              options: {list: visibilities, layout: 'radio', direction: 'horizontal'},
              initialValue: 'public',
              validation: (rule) => rule.required().error('Pick who can see the stream.'),
            }),
          ],
          preview: {
            select: {accountLabel: 'accountLabel', platform: 'platform', visibility: 'visibility'},
            prepare: ({accountLabel, platform, visibility}) => ({
              title: accountLabel || 'No account yet',
              subtitle: [titleOf(platforms, platform), titleOf(visibilities, visibility)]
                .filter(Boolean)
                .join(' · '),
            }),
          },
        }),
      ],
      // media-ops keeps one destination per platform and account label.
      validation: (rule) =>
        rule.custom((destinations: Destination[] | undefined) => {
          const seen = new Set<string>()
          const repeats = []
          for (const {_key, platform, accountLabel} of destinations ?? []) {
            if (!platform || !accountLabel) continue
            const pair = JSON.stringify([platform, accountLabel])
            if (seen.has(pair)) repeats.push([{_key}])
            seen.add(pair)
          }
          return repeats.length
            ? {
                message: 'This account is already listed for this platform. Remove one.',
                paths: repeats,
              }
            : true
        }),
      group: 'social',
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
