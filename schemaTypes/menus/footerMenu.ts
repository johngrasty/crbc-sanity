import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'footerMenu',
	title: 'Footer Menu',
	type: 'document',
	fields: [
		defineField({
			name: 'items',
			title: 'Menu Items',
			type: 'array',
			of: [
				{
					type: 'object',
					title: 'Menu Item',
					fields: [
						{
							name: 'text',
							title: 'Text',
							type: 'string',
							validation: (Rule) => Rule.required()
						},
						{
							name: 'link',
							title: 'Link',
							type: 'string',
							description: 'Use relative paths (e.g., "/about") for internal links or full URLs for external links',
							validation: (Rule) => Rule.required()
						},
						{
							name: 'isExternal',
							title: 'Is External Link',
							type: 'boolean',
							description: 'Open link in new tab?',
							initialValue: false
						}
					],
					preview: {
						select: {
							title: 'text',
							subtitle: 'link',
							isExternal: 'isExternal'
						},
						prepare({ title, subtitle, isExternal }) {
							return {
								title,
								subtitle: `${subtitle}${isExternal ? ' (external)' : ''}`
							};
						}
					}
				}
			]
		}),
		defineField({
			name: 'socialLinks',
			title: 'Show Social Media Links',
			description: 'Select which social media links to display in the footer. URLs are managed in Church Settings.',
			type: 'object',
			fields: [
				{
					name: 'showFacebook',
					title: 'Show Facebook',
					type: 'boolean',
					initialValue: true
				},
				{
					name: 'showInstagram',
					title: 'Show Instagram',
					type: 'boolean',
					initialValue: true
				},
				{
					name: 'showYouTube',
					title: 'Show YouTube',
					type: 'boolean',
					initialValue: true
				}
			]
		})
	],
	preview: {
		prepare() {
			return {
				title: 'Footer Menu'
			};
		}
	}
}); 