import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'staffOrder',
	title: 'Staff Display Order',
	type: 'document',
	fields: [
		defineField({
			name: 'category',
			title: 'Category',
			type: 'string',
			options: {
				list: [
					{ title: 'Pastoral Staff Display Order', value: 'pastoral' },
					{ title: 'Ministry Staff Display Order', value: 'ministry' },
					{ title: 'Support Staff Display Order', value: 'support' },
					{ title: 'Deacons Display Order', value: 'deacons' }
				]
			},
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'staff',
			title: 'Staff Members',
			type: 'array',
			of: [{ type: 'reference', to: [{ type: 'staff' }] }],
			validation: (Rule) => Rule.required()
		})
	],
	preview: {
		select: {
			category: 'category',
			title: 'category'
		},
		prepare({ category }) {
			const titles: Record<string, string> = {
				pastoral: 'Pastoral Staff Display Order',
				ministry: 'Ministry Staff Display Order',
				support: 'Support Staff Display Order',
				deacons: 'Deacons Display Order'
			};
			return {
				title: titles[category] || category
			};
		}
	}
}); 