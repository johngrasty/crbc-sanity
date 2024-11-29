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
			media: 'image'
		}
	}
}); 