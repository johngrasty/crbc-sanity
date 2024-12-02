import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'settings',
	title: 'Church Settings',
	type: 'document',
	fields: [
		defineField({
			name: 'name',
			title: 'Church Name',
			type: 'string'
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
					description: 'Street number and name'
				},
				{
					name: 'city',
					title: 'City',
					type: 'string'
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
					initialValue: 'NC'
				},
				{
					name: 'zipCode',
					title: 'ZIP Code',
					type: 'string',
					validation: (Rule) => Rule.regex(/^\d{5}(-\d{4})?$/).error('Please enter a valid ZIP code')
				},
				{
					name: 'phone',
					title: 'Phone',
					type: 'string'
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
							}
						},
						{
							name: 'time',
							title: 'Time',
							type: 'string'
						},
						{
							name: 'description',
							title: 'Description',
							type: 'string',
							description: 'e.g., "Sunday School", "Morning Worship", etc.'
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
			]
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
			name: 'alert',
			title: 'Site Alert',
			type: 'object',
			description: 'Display an alert banner at the top of the site',
			fields: [
				{
					name: 'enabled',
					title: 'Enable Alert',
					type: 'boolean',
					initialValue: false
				},
				{
					name: 'message',
					title: 'Alert Message',
					type: 'text',
					rows: 2
				},
				{
					name: 'type',
					title: 'Alert Type',
					type: 'string',
					options: {
						list: [
							{ title: 'Info', value: 'info' },
							{ title: 'Warning', value: 'warning' },
							{ title: 'Error', value: 'error' }
						]
					}
				},
				{
					name: 'link',
					title: 'Alert Link',
					type: 'string',
					description: 'Optional link for more information'
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