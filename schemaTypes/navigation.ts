import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'navigation',
	title: 'Navigation',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			description: 'For internal use (e.g., "Main Menu", "Footer Menu")'
		}),
		defineField({
			name: 'items',
			title: 'Navigation Items',
			type: 'array',
			of: [
				{
					type: 'object',
					title: 'Menu Item',
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
							name: 'children',
							title: 'Child Items',
							type: 'array',
							of: [
								{
									type: 'object',
									title: 'Child Item',
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
							subtitle: 'link'
						}
					}
				}
			]
		})
	],
	preview: {
		select: {
			title: 'title'
		}
	}
}); 