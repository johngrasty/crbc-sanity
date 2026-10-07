import {
  defineArrayMember,
  defineField,
  defineType,
  getPublishedId,
  type ValidationContext,
} from 'sanity'
import {CalendarClock} from 'lucide-react'
import {isResourceId} from '../../media-contract/src/ids'
import {editorialIdField} from './editorialId'
import {labelLimit} from './limits'
import {CHURCH_TIME_ZONE} from './timeZone'
import {isLocalTime, startMessages, startProblems, type ZonedStart} from './zonedStart'
import {ZonedStartInput} from './ZonedStartInput'

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

// A wall time such as Sun, Oct 11, 2026, 9:00 AM. It's formatted in UTC so the shown time is the
// one entered, whatever zone the editor's computer is in.
const formatLocal = (local: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(`${local}:00Z`))

const apiVersion = '2025-02-19'

// Other service events that aren't cancelled, in any of their published, draft or release
// versions. sanity::versionOf leaves out this event's own versions.
async function otherLiveEvents<T>(
  context: ValidationContext,
  filter: string,
  projection: string,
  params: Record<string, unknown>,
): Promise<T[]> {
  if (!context.document) return []
  const client = context.getClient({apiVersion}).withConfig({perspective: 'raw'})
  return client.fetch(
    `*[_type == "serviceEvent" && !sanity::versionOf($publishedId) && cancelled != true && ${filter}]${projection}`,
    {...params, publishedId: getPublishedId(context.document._id)},
  )
}

type ServiceEventValue = {
  cancelled?: boolean
  expectedDurationMinutes?: number
  resourceId?: string
  scheduledStart?: ZonedStart
}

// The minutes a stored start and length cover, as [start, end) in milliseconds, or null when the
// start or length isn't usable.
function runTime(utc: unknown, minutes: unknown): [number, number] | null {
  const start = typeof utc === 'string' ? Date.parse(utc) : NaN
  if (Number.isNaN(start) || typeof minutes !== 'number') return null
  return [start, start + minutes * 60_000]
}

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
      validation: (rule) => [
        rule.required().error('Pick the media item the recording goes into.'),
        rule
          .custom(async (reference: {_ref?: string} | undefined, context) => {
            const event = context.document as ServiceEventValue | undefined
            if (!reference?._ref || event?.cancelled) return true
            const others = await otherLiveEvents(context, 'mediaItem._ref == $ref', '._id', {
              ref: reference._ref,
            })
            return others.length
              ? 'Another service event uses this media item too. Each service usually gets its own item.'
              : true
          })
          .warning(),
      ],
      group: 'details',
    }),
    defineField({
      name: 'scheduledStart',
      title: 'Start',
      type: 'object',
      description:
        'The local date and time the service starts, in the time zone it takes place in. When the clocks go back and the time happens twice, choose which one you mean.',
      components: {input: ZonedStartInput},
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
      validation: (rule) => [
        rule.custom((start) => (start ? true : startMessages.missing)),
        rule
          .custom(async (start: ZonedStart | undefined, context) => {
            const event = context.document as ServiceEventValue | undefined
            if (!event || event.cancelled || !event.resourceId) return true
            if (Object.keys(startProblems(start)).length) return true
            const own = runTime(start?.utc, event.expectedDurationMinutes)
            if (!own) return true
            const others = await otherLiveEvents<{utc: unknown; minutes: unknown}>(
              context,
              'resourceId == $resourceId && defined(scheduledStart.utc)',
              '{"utc": scheduledStart.utc, "minutes": expectedDurationMinutes}',
              {resourceId: event.resourceId},
            )
            // An event without a length still takes up the moment it starts.
            const overlaps = others.some(({utc, minutes}) => {
              const other = runTime(utc, typeof minutes === 'number' ? minutes : 0)
              if (!other) return false
              const [otherStart, otherEnd] = other
              return otherStart < own[1] && own[0] < Math.max(otherEnd, otherStart + 1)
            })
            return overlaps
              ? 'Another service event on this live stream overlaps this one. Check both starts and lengths.'
              : true
          })
          .warning(),
      ],
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
      description:
        "Turn this on when the service won't happen. Cancelling works only before the service starts. Once it has started, put an editor hold on the media item instead.",
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
                labelLimit(rule),
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
  orderings: [
    {
      title: 'Start, soonest first',
      name: 'startAsc',
      by: [{field: 'scheduledStart.utc', direction: 'asc'}],
    },
    {
      title: 'Start, newest first',
      name: 'startDesc',
      by: [{field: 'scheduledStart.utc', direction: 'desc'}],
    },
  ],
  preview: {
    select: {
      local: 'scheduledStart.local',
      timeZone: 'scheduledStart.timeZone',
      itemTitle: 'mediaItem.title',
      cancelled: 'cancelled',
    },
    prepare({local, timeZone, itemTitle, cancelled}) {
      const start = local && isLocalTime(local) ? formatLocal(local) : 'No start yet'
      const zone = timeZone && timeZone !== CHURCH_TIME_ZONE ? ` ${timeZone}` : ''
      return {
        title: `${start}${zone}`,
        subtitle: [cancelled ? 'Cancelled' : undefined, itemTitle || 'No media item']
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
})
