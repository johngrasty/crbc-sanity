import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'logoCloud',
	title: 'Logo Cloud Section',
	type: 'object',
	fields: [
		defineField({
			name: 'heading',
			title: 'Heading',
			type: 'string',
			description: 'Optional heading for the logo cloud section'
		}),
		defineField({
			name: 'logos',
			title: 'Partner Logos',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						{
							name: 'name',
							title: 'Ministry/Partner Name',
							type: 'string',
							validation: Rule => Rule.required()
						},
						{
							name: 'logo',
							title: 'Logo',
							type: 'image',
							options: {
								accept: '.svg'
							},
							validation: Rule => Rule.required()
						},
						{
							name: 'url',
							title: 'Website URL',
							type: 'url',
							description: 'Optional link to partner website'
						}
					],
					preview: {
						select: {
							title: 'name',
							media: 'logo'
						}
					}
				}
			]
		})
	],
	preview: {
		select: {
			title: 'heading'
		},
		prepare({ title }) {
			return {
				title: title || 'Logo Cloud Section'
			};
		}
	}
}); 