import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'registration',
	title: 'Registration Opportunity',
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
			name: 'description',
			title: 'Description',
			type: 'text',
			rows: 3,
			description: 'Brief description of the registration opportunity'
		}),
		defineField({
			name: 'category',
			title: 'Category',
			type: 'string',
			options: {
				list: [
					{ title: 'Event', value: 'event' },
					{ title: 'Ministry', value: 'ministry' },
					{ title: 'Volunteer Opportunity', value: 'volunteer' }
				],
				layout: 'radio'
			},
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'integrationMethod',
			title: 'Integration Method',
			type: 'string',
			options: {
				list: [
					{ title: 'Embedded Form', value: 'embed' },
					{ title: 'Direct Link', value: 'link' },
					{ title: 'API Integration', value: 'api' }
				],
				layout: 'radio'
			},
			validation: (Rule) => Rule.required(),
			description: 'How this registration integrates with Planning Center Online'
		}),
		defineField({
			name: 'pcoEventId',
			title: 'PCO Event ID',
			type: 'string',
			description: 'Planning Center Online Event ID for API integration',
			hidden: ({ parent }) => parent?.integrationMethod !== 'api'
		}),
		defineField({
			name: 'pcoFormUrl',
			title: 'PCO Form URL',
			type: 'url',
			description: 'Direct link to Planning Center Online registration form',
			hidden: ({ parent }) => parent?.integrationMethod !== 'link'
		}),
		defineField({
			name: 'pcoEmbedCode',
			title: 'PCO Embed Code',
			type: 'text',
			rows: 5,
			description: 'HTML embed code from Planning Center Online',
			hidden: ({ parent }) => parent?.integrationMethod !== 'embed'
		}),
		defineField({
			name: 'deadline',
			title: 'Registration Deadline',
			type: 'datetime',
			description: 'When registration closes for this opportunity'
		}),
		defineField({
			name: 'featured',
			title: 'Featured',
			type: 'boolean',
			description: 'Display this registration prominently on the sign-up page',
			initialValue: false
		}),
		defineField({
			name: 'active',
			title: 'Active',
			type: 'boolean',
			description: 'Whether this registration opportunity is currently available',
			initialValue: true
		}),
		defineField({
			name: 'image',
			title: 'Featured Image',
			type: 'image',
			options: {
				hotspot: true
			},
			description: 'Optional image for this registration opportunity'
		})
	],
	orderings: [
		{
			title: 'Featured First',
			name: 'featuredFirst',
			by: [
				{ field: 'featured', direction: 'desc' },
				{ field: 'title', direction: 'asc' }
			]
		},
		{
			title: 'Category',
			name: 'category',
			by: [
				{ field: 'category', direction: 'asc' },
				{ field: 'title', direction: 'asc' }
			]
		}
	],
	preview: {
		select: {
			title: 'title',
			category: 'category',
			integrationMethod: 'integrationMethod',
			active: 'active',
			featured: 'featured',
			media: 'image'
		},
		prepare({ title, category, integrationMethod, active, featured, media }) {
			const status = active ? '✅' : '❌';
			const featuredIcon = featured ? '⭐' : '';
			const methodIcon = integrationMethod === 'embed' ? '📋' : integrationMethod === 'link' ? '🔗' : '🔌';
			
			return {
				title,
				subtitle: `${status} ${featuredIcon} ${methodIcon} ${category || 'Unknown'}`,
				media
			};
		}
	}
});