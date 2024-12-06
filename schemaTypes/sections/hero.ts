import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'hero',
	title: 'Hero Section',
	type: 'object',
	groups: [
		{
			name: 'content',
			title: 'Content',
		},
		{
			name: 'style',
			title: 'Style & Layout',
		}
	],
	fields: [
		defineField({
			name: 'heading',
			title: 'Heading',
			type: 'string',
			group: 'content',
			validation: Rule => Rule.required()
		}),
		defineField({
			name: 'tagline',
			title: 'Tagline',
			type: 'text',
			group: 'content',
			rows: 2
		}),
		defineField({
			name: 'backgroundImage',
			title: 'Background Image',
			type: 'image',
			group: 'style',
			options: {
				hotspot: true
			}
		}),
		defineField({
			name: 'primaryCTA',
			title: 'Primary Call to Action',
			type: 'object',
			group: 'content',
			fields: [
				{
					name: 'text',
					title: 'Button Text',
					type: 'string',
					initialValue: 'Plan Your Visit'
				},
				{
					name: 'link',
					title: 'Button Link',
					type: 'string',
					initialValue: '/visit'
				}
			]
		}),
		defineField({
			name: 'secondaryCTA',
			title: 'Secondary Call to Action',
			type: 'object',
			group: 'content',
			fields: [
				{
					name: 'text',
					title: 'Button Text',
					type: 'string',
					initialValue: 'Learn More'
				},
				{
					name: 'link',
					title: 'Button Link',
					type: 'string',
					initialValue: '/about'
				}
			]
		}),
		defineField({
			name: 'style',
			title: 'Style Variant',
			type: 'string',
			group: 'style',
			options: {
				list: [
					{ title: 'Default', value: 'default' },
					{ title: 'Centered', value: 'centered' },
					{ title: 'Full Width', value: 'full' }
				]
			},
			initialValue: 'default'
		})
	],
	preview: {
		select: {
			title: 'heading',
			subtitle: 'tagline'
		}
	}
}); 