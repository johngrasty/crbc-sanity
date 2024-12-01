import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'gallery',
	title: 'Gallery',
	type: 'object',
	fields: [
		defineField({
			name: 'title',
			title: 'Gallery Title',
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
							name: 'alt',
							title: 'Alt Text',
							type: 'string',
							description: 'Required for accessibility',
							validation: (Rule) => Rule.required()
						},
						{
							name: 'caption',
							title: 'Caption',
							type: 'string'
						}
					]
				}
			],
			validation: (Rule) => Rule.min(2).error('A gallery needs at least 2 images')
		}),
		defineField({
			name: 'layout',
			title: 'Layout Style',
			type: 'string',
			options: {
				list: [
					{ title: 'Carousel', value: 'carousel' },
					{ title: 'Grid', value: 'grid' },
					{ title: 'Masonry', value: 'masonry' }
				]
			},
			initialValue: 'carousel'
		}),
		defineField({
			name: 'aspectRatio',
			title: 'Image Aspect Ratio',
			type: 'string',
			options: {
				list: [
					{ title: 'Square (1:1)', value: '1:1' },
					{ title: 'Landscape (16:9)', value: '16:9' },
					{ title: 'Portrait (3:4)', value: '3:4' },
					{ title: 'Original', value: 'original' }
				]
			},
			initialValue: 'original',
			hidden: ({ parent }) => parent?.layout === 'masonry'
		})
	],
	preview: {
		select: {
			title: 'title',
			media: 'images.0',
			imageCount: 'images.length'
		},
		prepare({ title, media, imageCount = 0 }) {
			return {
				title: title || 'Gallery',
				subtitle: `${imageCount} image${imageCount === 1 ? '' : 's'}`,
				media
			};
		}
	}
}); 