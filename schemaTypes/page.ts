import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'page',
	title: 'Page',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'pageType',
			title: 'Page Type',
			type: 'string',
			options: {
				list: [
					{ title: 'Home', value: 'home' },
					{ title: 'About', value: 'about' },
					{ title: 'Ministries', value: 'ministries' },
					{ title: 'Events', value: 'events' },
					{ title: 'Contact', value: 'contact' },
					{ title: 'Other', value: 'other' }
				]
			},
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
			rows: 3
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
			name: 'sections',
			title: 'Page Sections',
			type: 'array',
			of: [
				{ type: 'hero' },
				{ type: 'textWithImage' },
				{ type: 'gallery' },
				{ type: 'callToAction' }
			]
		})
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'pageType',
			media: 'image'
		}
	}
}); 