import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'article',
	title: 'Articles',
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
				source: 'title',
				maxLength: 96
			},
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'publishedAt',
			title: 'Published At',
			type: 'datetime',
			initialValue: () => new Date().toISOString(),
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'category',
			title: 'Category',
			type: 'string',
			options: {
				list: [
					{ title: 'Church News', value: 'news' },
					{ title: 'Devotional', value: 'devotional' },
					{ title: 'Ministry Spotlight', value: 'ministry' },
					{ title: 'Missions Update', value: 'missions' },
					{ title: 'General', value: 'general' }
				]
			},
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'author',
			title: 'Author',
			type: 'reference',
			to: [{ type: 'staff' }]
		}),
		defineField({
			name: 'mainImage',
			title: 'Main Image',
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
			description: 'A short summary for previews and SEO',
			validation: (Rule) => Rule.max(200)
		}),
		defineField({
			name: 'content',
			title: 'Content',
			type: 'array',
			of: [
				{
					type: 'block',
					styles: [
						{ title: 'Normal', value: 'normal' },
						{ title: 'Heading 2', value: 'h2' },
						{ title: 'Heading 3', value: 'h3' },
						{ title: 'Quote', value: 'blockquote' }
					],
					marks: {
						decorators: [
							{ title: 'Strong', value: 'strong' },
							{ title: 'Emphasis', value: 'em' },
							{ title: 'Underline', value: 'underline' }
						]
					}
				},
				{
					type: 'image',
					options: {
						hotspot: true
					},
					fields: [
						{
							name: 'caption',
							type: 'string',
							title: 'Caption',
							options: {
								isHighlighted: true
							}
						},
						{
							name: 'alt',
							type: 'string',
							title: 'Alt Text',
							options: {
								isHighlighted: true
							}
						}
					]
				}
			]
		}),
		defineField({
			name: 'tags',
			title: 'Tags',
			type: 'array',
			of: [{ type: 'string' }],
			options: {
				layout: 'tags'
			}
		}),
		defineField({
			name: 'seo',
			title: 'SEO Settings',
			type: 'object',
			fields: [
				{
					name: 'metaTitle',
					title: 'Meta Title',
					type: 'string',
					description: 'Override the default meta title'
				},
				{
					name: 'metaDescription',
					title: 'Meta Description',
					type: 'text',
					rows: 3,
					description: 'Override the default meta description'
				},
				{
					name: 'shareImage',
					title: 'Share Image',
					type: 'image',
					description: 'Image used for social media sharing'
				}
			]
		})
	],
	preview: {
		select: {
			title: 'title',
			author: 'author.name',
			media: 'mainImage',
			category: 'category'
		},
		prepare({ title, author, media, category }) {
			const categoryLabels = {
				news: 'Church News',
				devotional: 'Devotional',
				ministry: 'Ministry Spotlight',
				missions: 'Missions Update',
				general: 'General'
			};
			return {
				title,
				subtitle: `${categoryLabels[category] || category}${author ? ` by ${author}` : ''}`,
				media
			};
		}
	},
	orderings: [
		{
			title: 'Published Date, New',
			name: 'publishedDateDesc',
			by: [{ field: 'publishedAt', direction: 'desc' }]
		},
		{
			title: 'Published Date, Old',
			name: 'publishedDateAsc',
			by: [{ field: 'publishedAt', direction: 'asc' }]
		}
	]
}); 