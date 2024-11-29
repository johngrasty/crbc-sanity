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
			name: 'publishDate',
			title: 'Publish Date',
			type: 'datetime',
			initialValue: () => new Date().toISOString()
		}),
		defineField({
			name: 'expiryDate',
			title: 'Expiry Date',
			type: 'datetime',
			description: 'Optional. When this announcement should stop being displayed'
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
			name: 'excerpt',
			title: 'Excerpt',
			type: 'text',
			rows: 3,
			description: 'Brief summary for previews and social sharing'
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
			name: 'cta',
			title: 'Call to Action',
			type: 'object',
			fields: [
				{
					name: 'text',
					title: 'Text',
					type: 'string'
				},
				{
					name: 'link',
					title: 'Link',
					type: 'string'
				},
				{
					name: 'style',
					title: 'Style',
					type: 'string',
					options: {
						list: [
							{ title: 'Primary', value: 'primary' },
							{ title: 'Secondary', value: 'secondary' },
							{ title: 'Outline', value: 'outline' }
						]
					}
				}
			]
		})
	],
	orderings: [
		{
			title: 'Publish Date, New',
			name: 'publishDateDesc',
			by: [{ field: 'publishDate', direction: 'desc' }]
		}
	],
	preview: {
		select: {
			title: 'title',
			date: 'publishDate',
			media: 'image'
		},
		prepare({ title, date, media }) {
			return {
				title,
				subtitle: date ? new Date(date).toLocaleDateString() : '',
				media
			};
		}
	}
}); 