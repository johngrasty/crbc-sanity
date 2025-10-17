import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'announcement',
	title: 'Announcements',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'slug',
			title: 'Slug',
			type: 'slug',
			options: {
				source: 'title'
			},
			validation: (Rule) => Rule.required()
		}),

		defineField({
			name: 'featured',
			title: 'Featured',
			type: 'boolean',
			description: 'Feature this announcement on the home page',
			initialValue: false
		}),
		defineField({
			name: 'image',
			title: 'Featured Image',
			type: 'image',
			options: {
				hotspot: true
			}
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
			rows: 3,
			description: 'Brief description for carousel display and previews',
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'content',
			title: 'Content',
			type: 'array',
			of: [
				{ type: 'block' },
				{
					type: 'image',
					options: {
						hotspot: true
					}
				}
			]
		}),
		defineField({
			name: 'ctaText',
			title: 'Call to Action Text',
			type: 'string',
			description: 'Text for the call-to-action button (optional)'
		}),
		defineField({
			name: 'ctaLink',
			title: 'Call to Action Link',
			type: 'url',
			description: 'URL for the call-to-action button (optional)'
		}),
		defineField({
			name: 'priority',
			title: 'Priority',
			type: 'number',
			description: 'Higher numbers appear first in the carousel',
			initialValue: 1,
			validation: (Rule) => Rule.min(1).max(10)
		}),
		defineField({
			name: 'startDate',
			title: 'Start Date',
			type: 'datetime',
			description: 'When this announcement should start being displayed',
			initialValue: () => new Date().toISOString()
		}),
		defineField({
			name: 'endDate',
			title: 'End Date',
			type: 'datetime',
			description: 'When this announcement should stop being displayed'
		}),
		defineField({
			name: 'active',
			title: 'Active',
			type: 'boolean',
			description: 'Whether this announcement is currently active',
			initialValue: true
		})
	],
	orderings: [
		{
			title: 'Priority, High to Low',
			name: 'priorityDesc',
			by: [{ field: 'priority', direction: 'desc' }]
		},
		{
			title: 'Start Date, New',
			name: 'startDateDesc',
			by: [{ field: 'startDate', direction: 'desc' }]
		}
	],
	preview: {
		select: {
			title: 'title',
			description: 'description',
			active: 'active',
			priority: 'priority',
			media: 'image'
		},
		prepare({ title, description, active, priority, media }) {
			return {
				title,
				subtitle: `${active ? '✅' : '❌'} Priority: ${priority || 1} - ${description || ''}`,
				media
			};
		}
	}
}); 