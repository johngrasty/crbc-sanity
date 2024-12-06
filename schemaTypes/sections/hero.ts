import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'hero',
	title: 'Hero Section',
	type: 'object',
	fields: [
		defineField({
			name: 'heading',
			title: 'Heading',
			type: 'string'
		}),
		defineField({
			name: 'tagline',
			title: 'Tagline',
			type: 'text',
			rows: 2
		}),
		defineField({
			name: 'backgroundImage',
			title: 'Background Image',
			type: 'image',
			options: {
				hotspot: true
			}
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
				}
			]
		})
	],
	preview: {
		select: {
			title: 'heading',
			subtitle: 'tagline',
			media: 'backgroundImage'
		}
	}
}); 