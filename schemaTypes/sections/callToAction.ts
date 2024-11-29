import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'callToAction',
	title: 'Call to Action',
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
			type: 'text',
			rows: 3
		}),
		defineField({
			name: 'buttons',
			title: 'Buttons',
			type: 'array',
			of: [
				{
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
				}
			]
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
			name: 'style',
			title: 'Style',
			type: 'string',
			options: {
				list: [
					{ title: 'Light', value: 'light' },
					{ title: 'Dark', value: 'dark' },
					{ title: 'Brand', value: 'brand' }
				]
			}
		})
	],
	preview: {
		select: {
			title: 'heading',
			subtitle: 'text'
		}
	}
}); 