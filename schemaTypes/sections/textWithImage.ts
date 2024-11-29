import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'textWithImage',
	title: 'Text with Image',
	type: 'object',
	fields: [
		defineField({
			name: 'heading',
			title: 'Heading',
			type: 'string'
		}),
		defineField({
			name: 'text',
			title: 'Text',
			type: 'array',
			of: [{ type: 'block' }]
		}),
		defineField({
			name: 'image',
			title: 'Image',
			type: 'image',
			options: {
				hotspot: true
			}
		}),
		defineField({
			name: 'imagePosition',
			title: 'Image Position',
			type: 'string',
			options: {
				list: [
					{ title: 'Left', value: 'left' },
					{ title: 'Right', value: 'right' }
				],
				layout: 'radio'
			}
		})
	],
	preview: {
		select: {
			title: 'heading',
			media: 'image'
		}
	}
}); 