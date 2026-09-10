import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'settings',
	title: 'Church Settings',
	type: 'document',
	fields: [
		defineField({
			name: 'name',
			title: 'Church Name',
			type: 'string',
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'url',
			title: 'Church Website URL',
			type: 'url',
			description: 'The main website URL (e.g., https://www.example.com)'
		}),
		defineField({
			name: 'contact',
			title: 'Contact Information',
			type: 'object',
			fields: [
				{
					name: 'streetAddress',
					title: 'Street Address',
					type: 'text',
					rows: 2,
					description: 'Street number and name',
					validation: (Rule) => Rule.required()
				},
				{
					name: 'city',
					title: 'City',
					type: 'string',
					validation: (Rule) => Rule.required()
				},
				{
					name: 'state',
					title: 'State',
					type: 'string',
					options: {
						list: [
							{ title: 'North Carolina', value: 'NC' }
						]
					},
					initialValue: 'NC',
					validation: (Rule) => Rule.required()
				},
				{
					name: 'zipCode',
					title: 'ZIP Code',
					type: 'string',
					validation: (Rule) => Rule.required().regex(/^\d{5}(-\d{4})?$/).error('Please enter a valid ZIP code')
				},
				{
					name: 'phone',
					title: 'Phone',
					type: 'string',
					validation: (Rule) => Rule.required()
				},
				{
					name: 'email',
					title: 'Email',
					type: 'string',
					description: 'Email address for general inquiries',
					validation: (Rule) => Rule.email().error('Please enter a valid email address')
				},
				{
					name: 'supportEmail',
					title: 'Support Email',
					type: 'string',
					description: 'Email address for support inquiries (used on error pages)',
					validation: (Rule) => Rule.email().error('Please enter a valid email address')
				}
			]
		}),
		defineField({
			name: 'serviceTimes',
			title: 'Service Times',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						{
							name: 'day',
							title: 'Day',
							type: 'string',
							options: {
								list: [
									'Sunday',
									'Monday',
									'Tuesday',
									'Wednesday',
									'Thursday',
									'Friday',
									'Saturday'
								]
							},
							validation: (Rule) => Rule.required()
						},
						{
							name: 'time',
							title: 'Time',
							type: 'string',
							validation: (Rule) => Rule.required()
						},
						{
							name: 'description',
							title: 'Description',
							type: 'string',
							description: 'e.g., "Sunday School", "Morning Worship", etc.',
							validation: (Rule) => Rule.required()
						},
						{
							name: 'detailedDescription',
							title: 'Detailed Description',
							type: 'text',
							rows: 3,
							description: 'More detailed description for the visit page explaining what to expect in this service'
						}
					],
					preview: {
						select: {
							day: 'day',
							time: 'time',
							description: 'description'
						},
						prepare({ day, time, description }) {
							return {
								title: `${day} - ${time}`,
								subtitle: description
							};
						}
					}
				}
			],
			validation: (Rule) =>
				Rule.min(1).error('Add at least one service time; the home, visit and services pages list them')
		}),
		defineField({
			name: 'socialMedia',
			title: 'Social Media',
			type: 'object',
			fields: [
				{
					name: 'facebook',
					title: 'Facebook URL',
					type: 'url'
				},
				{
					name: 'instagram',
					title: 'Instagram URL',
					type: 'url'
				},
				{
					name: 'youtube',
					title: 'YouTube URL',
					type: 'url'
				}
			]
		}),
		defineField({
			name: 'seo',
			title: 'SEO Settings',
			type: 'object',
			fields: [
				{
					name: 'title',
					title: 'Default Meta Title',
					type: 'string'
				},
				{
					name: 'description',
					title: 'Default Meta Description',
					type: 'text',
					rows: 3
				},
				{
					name: 'image',
					title: 'Default Social Image',
					type: 'image',
					description: 'Used when sharing on social media'
				}
			]
		})
	],
	preview: {
		prepare() {
			return {
				title: 'Church Settings'
			};
		}
	}
}); 