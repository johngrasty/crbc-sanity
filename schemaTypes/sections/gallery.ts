import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'gallery',
	title: 'Gallery',
	type: 'object',
	fields: [
		defineField({
			name: 'heading',
			title: 'Heading',
			type: 'string'
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
			rows: 2
		}),
		defineField({
			name: 'images',
			title: 'Images',
			type: 'array',
			of: [
				{
					type: 'image',
					options: {
						hotspot: true
					},
					fields: [
						{
							name: 'caption',
							title: 'Caption',
							type: 'string'
						},
						{
							name: 'alt',
							title: 'Alt Text',
							type: 'string'
						}
					]
				}
			]
		}),
		defineField({
			name: 'layout',
			title: 'Layout',
			type: 'string',
			options: {
				list: [
					{ title: 'Grid', value: 'grid' },
					{ title: 'Masonry', value: 'masonry' },
					{ title: 'Carousel', value: 'carousel' }
				],
				layout: 'radio'
			}
		})
	],
	preview: {
		select: {
			title: 'heading',
			media: 'images.0'
		}
	}
}); 