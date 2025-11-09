import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'ministry',
	title: 'Ministry',
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
			description: 'Brief description of the ministry'
		}),
		defineField({
			name: 'heroImage',
			title: 'Hero Image',
			type: 'image',
			options: {
				hotspot: true,
				aiAssist: {
					imageDescriptionField: 'alt'
				}
			},
			description: 'Main image displayed at the top of the ministry page',
			fields: [
				{
					name: 'alt',
					type: 'string',
					title: 'Alternative Text',
					description: 'Describe ministry activities or members (10-125 characters). Example: "Youth group students studying Bible together". Use AI Assist (✨) to generate. See ALT_TEXT_GUIDE.md.',
					validation: (Rule) => Rule.required().min(10).max(125).error('Alt text is required (10-125 characters) for accessibility')
				}
			]
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
			],
			description: 'Main content for the ministry page'
		}),
		defineField({
			name: 'leadership',
			title: 'Leadership',
			type: 'array',
			of: [
				{
					type: 'reference',
					to: [{ type: 'staff' }]
				}
			],
			description: 'Staff members who lead this ministry'
		}),
		defineField({
			name: 'meetingTimes',
			title: 'Meeting Times',
			type: 'string',
			description: 'When and where this ministry meets'
		}),
		defineField({
			name: 'contactInfo',
			title: 'Contact Information',
			type: 'object',
			fields: [
				{
					name: 'email',
					title: 'Email',
					type: 'string'
				},
				{
					name: 'phone',
					title: 'Phone',
					type: 'string'
				},
				{
					name: 'contactPerson',
					title: 'Contact Person',
					type: 'string'
				}
			],
			description: 'How people can get in touch about this ministry'
		}),
		defineField({
			name: 'gallery',
			title: 'Gallery',
			type: 'array',
			of: [
				{
					type: 'image',
					options: {
						hotspot: true
					}
				}
			],
			description: 'Photo gallery for this ministry'
		}),
		defineField({
			name: 'pcoTag',
			title: 'Planning Center Tag',
			type: 'string',
			description: 'Tag name from the "Ministry" tag group in Planning Center Calendar (e.g., "Men\'s Ministry", "Youth", "Women\'s Ministry"). Events with this tag will appear on the ministry page.'
		}),
		defineField({
			name: 'featured',
			title: 'Featured',
			type: 'boolean',
			description: 'Display this ministry prominently on the ministries overview page',
			initialValue: false
		})
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'description',
			media: 'heroImage'
		}
	}
});