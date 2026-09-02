import {defineField, defineType} from 'sanity'
import {Briefcase} from 'lucide-react'

export default defineType({
  name: 'jobOpening',
  title: 'Job Opening',
  type: 'document',
  icon: Briefcase,
  groups: [
    {
      name: 'role',
      title: 'Role',
      default: true,
    },
    {
      name: 'application',
      title: 'Application',
    },
    {
      name: 'publishing',
      title: 'Publishing',
    },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Job title',
      type: 'string',
      description: 'Use the title candidates would enter on a job board.',
      validation: (Rule) => Rule.required().max(100),
      group: 'role',
    }),
    defineField({
      name: 'department',
      title: 'Ministry or department',
      type: 'string',
      placeholder: "Children's ministry",
      validation: (Rule) => Rule.required().max(80),
      group: 'role',
    }),
    defineField({
      name: 'employmentType',
      title: 'Employment type',
      type: 'string',
      options: {
        list: [
          {title: 'Full-time', value: 'fullTime'},
          {title: 'Part-time', value: 'partTime'},
          {title: 'Contract', value: 'contract'},
          {title: 'Internship', value: 'internship'},
        ],
        layout: 'radio',
      },
      initialValue: 'fullTime',
      validation: (Rule) => Rule.required(),
      group: 'role',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'If the role is remote or hybrid, say so here.',
      initialValue: 'Maggie Valley, NC',
      validation: (Rule) => Rule.required().max(100),
      group: 'role',
    }),
    defineField({
      name: 'schedule',
      title: 'Expected schedule',
      type: 'string',
      placeholder: 'Sunday through Thursday, with occasional evenings',
      description: 'Keep this short. Put the full schedule in the role summary.',
      validation: (Rule) => Rule.max(120),
      group: 'role',
    }),
    defineField({
      name: 'summary',
      title: 'Role summary',
      type: 'text',
      rows: 4,
      description:
        'In one short paragraph, describe the main duties and the people this role supports.',
      validation: (Rule) => Rule.required().max(360),
      group: 'role',
    }),
    defineField({
      name: 'responsibilities',
      title: 'Primary responsibilities',
      type: 'array',
      of: [{type: 'string'}],
      description: 'Use short, specific statements. Include only the duties that matter most.',
      validation: (Rule) => Rule.max(12),
      group: 'role',
    }),
    defineField({
      name: 'qualifications',
      title: 'What the role requires',
      type: 'array',
      of: [{type: 'string'}],
      description: 'List only genuine requirements. Avoid vague personality labels.',
      validation: (Rule) => Rule.max(12),
      group: 'role',
    }),
    defineField({
      name: 'applicationInstructions',
      title: 'Application instructions',
      type: 'text',
      rows: 3,
      placeholder:
        'Please include a résumé, references, and a brief note explaining your interest.',
      group: 'application',
    }),
    defineField({
      name: 'applicationUrl',
      title: 'Application URL',
      type: 'url',
      description: 'When blank, the button starts an email.',
      validation: (Rule) =>
        Rule.uri({
          scheme: ['http', 'https'],
          allowRelative: false,
        }),
      group: 'application',
    }),
    defineField({
      name: 'applicationEmail',
      title: 'Application email',
      type: 'string',
      description: 'If blank, applications go to the email in site settings.',
      validation: (Rule) => Rule.email(),
      group: 'application',
    }),
    defineField({
      name: 'active',
      title: 'Show on the website',
      type: 'boolean',
      description: 'Turn this off to hide the role without deleting it.',
      initialValue: true,
      validation: (Rule) => Rule.required(),
      group: 'publishing',
    }),
    defineField({
      name: 'openDate',
      title: 'Start showing on',
      type: 'datetime',
      description:
        'Leave blank to show the role as soon as you publish it. Set a date and time to schedule it.',
      group: 'publishing',
    }),
    defineField({
      name: 'closeDate',
      title: 'Application deadline',
      type: 'datetime',
      description:
        'Set the last moment you will accept applications, for example 5:00 PM on the last day. A deadline set to 12:00 AM removes the role before that day starts. The website removes the role a few minutes after the deadline.',
      validation: (Rule) =>
        Rule.min(Rule.valueOfField('openDate')).error(
          'The application deadline must be after the start date.',
        ),
      group: 'publishing',
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display order',
      type: 'number',
      description: 'Lower numbers appear first.',
      initialValue: 100,
      validation: (Rule) => Rule.required().integer().min(0),
      group: 'publishing',
    }),
  ],
  orderings: [
    {
      title: 'Website order',
      name: 'websiteOrder',
      by: [
        {field: 'displayOrder', direction: 'asc'},
        {field: 'title', direction: 'asc'},
      ],
    },
    {
      title: 'Closing soon',
      name: 'closingSoon',
      by: [{field: 'closeDate', direction: 'asc'}],
    },
  ],
  preview: {
    select: {
      title: 'title',
      department: 'department',
      employmentType: 'employmentType',
      active: 'active',
      openDate: 'openDate',
      closeDate: 'closeDate',
    },
    prepare({title, department, employmentType, active, openDate, closeDate}) {
      const now = new Date()
      const opens = openDate ? new Date(openDate) : null
      const closes = closeDate ? new Date(closeDate) : null
      const typeLabels: Record<string, string> = {
        fullTime: 'Full-time',
        partTime: 'Part-time',
        contract: 'Contract',
        internship: 'Internship',
      }

      let status = 'Active'
      if (!active) status = 'Hidden'
      else if (opens && opens > now) status = 'Scheduled'
      else if (closes && closes < now) status = 'Closed'

      return {
        title,
        subtitle: `${status} · ${department || 'No department'} · ${typeLabels[employmentType] || employmentType || 'No type'}`,
      }
    },
  },
})
