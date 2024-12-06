import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'hero',
	title: 'Hero Section',
	type: 'object',
	fields: [
		defineField({
			name: 'heading',
			title: 'Heading',
			type: 'string',
			validation: Rule => Rule.required()
		}),
		defineField({
			name: 'tagline',
			title: 'Tagline',
			type: 'text',
			rows: 2,
			validation: Rule => Rule.required()
		}),
		defineField({
			name: 'backgroundImage',
			title: 'Background Image',
			type: 'image',
			options: {
				hotspot: true
			},
			validation: Rule => Rule.required()
		}),
		defineField({
			name: 'gradientFrom',
			title: 'Gradient Start Color',
			type: 'string',
			description: 'Color in hex format (e.g., #ffffff)',
			initialValue: '#ffffff'
		}),
		defineField({
			name: 'gradientTo',
			title: 'Gradient End Color',
			type: 'string',
			description: 'Color in hex format (e.g., #f3f4f6)',
			initialValue: '#f3f4f6'
		}),
		defineField({
			name: 'primaryCTA',
			title: 'Primary Call to Action',
			type: 'object',
			validation: Rule => Rule.required(),
			fields: [
				{
					name: 'text',
					title: 'Button Text',
					type: 'string',
					validation: Rule => Rule.required()
				},
				{
					name: 'link',
					title: 'Button Link',
					type: 'string',
					validation: Rule => Rule.required()
				}
			]
		}),
		defineField({
			name: 'secondaryCTA',
			title: 'Secondary Call to Action',
			type: 'object',
			fields: [
				{
					name: 'text',
					title: 'Button Text',
					type: 'string',
					validation: Rule => Rule.required()
				},
				{
					name: 'link',
					title: 'Button Link',
					type: 'string',
					validation: Rule => Rule.required()
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