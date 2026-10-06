import {defineField, defineType} from 'sanity'
import {Video} from 'lucide-react'
import {editorialIdField} from './editorialId'
import {CHURCH_TIME_ZONE, isTimeZone, timeZoneMessage} from './timeZone'

// A real day written as YYYY-MM-DD, the way Sanity stores a date field.
function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

const kinds = [
  {title: 'Full service', value: 'service'},
  {title: 'Sermon', value: 'sermon'},
  {title: 'Audio only', value: 'audio'},
  {title: 'Other', value: 'other'},
]

// A service date is a calendar day, so it's formatted in UTC to keep the day from shifting.
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {dateStyle: 'medium', timeZone: 'UTC'}).format(
    new Date(`${value}T00:00:00Z`),
  )

export default defineType({
  name: 'mediaItem',
  title: 'Media item',
  type: 'document',
  icon: Video,
  groups: [{name: 'details', title: 'Details', default: true}],
  fields: [
    {...editorialIdField('mediaItem'), group: 'details'},
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      description: 'What the recording holds. Most items are a full service.',
      options: {list: kinds, layout: 'radio'},
      initialValue: 'service',
      validation: (rule) => rule.required(),
      group: 'details',
    }),
    // media-ops holds the recording until the title and date are filled in, so an editor can
    // publish a placeholder for next week's service. The warnings are custom rules, because
    // typegen reads required() as a required field even at warning level.
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description:
        'The sermon or service title viewers see. You can publish without one, but the recording waits until you add it.',
      validation: (rule) => [
        rule.max(200),
        rule
          .custom((value) =>
            value ? true : "Add a title. The recording won't publish until the item has one.",
          )
          .warning(),
      ],
      group: 'details',
    }),
    defineField({
      name: 'serviceDate',
      title: 'Service date',
      type: 'date',
      description:
        'The day of the service, as the church calendar shows it. Lists show the newest date first.',
      validation: (rule) => [
        rule
          .custom((value) =>
            value
              ? true
              : "Add the service date. The recording won't publish until the item has one.",
          )
          .warning(),
        // Sanity's date type doesn't check what the API stores.
        rule.custom((value) =>
          !value || isCalendarDate(value) ? true : 'Pick the service date from the calendar.',
        ),
      ],
      group: 'details',
    }),
    defineField({
      name: 'serviceTimezone',
      title: 'Time zone',
      type: 'string',
      description:
        'Leave this as America/New_York unless the service took place in another time zone. Use a name like America/Chicago.',
      initialValue: CHURCH_TIME_ZONE,
      validation: (rule) => [
        rule.required(),
        rule.custom((value) => (!value || isTimeZone(value) ? true : timeZoneMessage)),
      ],
      group: 'details',
    }),
  ],
  orderings: [
    {
      title: 'Service date, newest first',
      name: 'serviceDateDesc',
      by: [{field: 'serviceDate', direction: 'desc'}],
    },
  ],
  preview: {
    select: {title: 'title', serviceDate: 'serviceDate', kind: 'kind'},
    prepare({title, serviceDate, kind}) {
      const kindTitle = kinds.find(({value}) => value === kind)?.title
      return {
        title: title || 'Untitled media item',
        subtitle: [serviceDate ? formatDate(serviceDate) : 'No date', kindTitle]
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
})
