import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'mainMenu',
	title: 'Main Navigation',
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
						},
						{
							name: 'highlight',
							title: 'Highlight Item',
							type: 'boolean',
							description: 'Style this item differently (e.g., button style)',
							initialValue: false
						},
						{
							name: 'children',
							title: 'Dropdown Items',
							type: 'array',
							of: [
								{
									type: 'object',
									title: 'Dropdown Item',
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
											subtitle: 'link'
										}
									}
								}
							]
						}
					],
					preview: {
						select: {
							title: 'text',
							subtitle: 'link',
							isExternal: 'isExternal',
							highlight: 'highlight'
						},
						prepare({ title, subtitle, isExternal, highlight }) {
							return {
								title,
								subtitle: `${subtitle}${isExternal ? ' (external)' : ''}${highlight ? ' [highlighted]' : ''}`
							};
						}
					}
				}
			]
		})
	],
	preview: {
		prepare() {
			return {
				title: 'Main Navigation'
			};
		}
	}
}); 