import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'resource',
	title: 'Resources',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
			rows: 3
		}),
		defineField({
			name: 'category',
			title: 'Category',
			type: 'string',
			options: {
				list: [
					{ title: 'Ministry Forms', value: 'forms' },
					{ title: 'Bible Study', value: 'bible-study' },
					{ title: 'Church Documents', value: 'documents' },
					{ title: 'Worship', value: 'worship' },
					{ title: 'Newsletter', value: 'newsletter' }
				]
			},
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'file',
			title: 'File',
			type: 'file',
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'fileType',
			title: 'File Type',
			type: 'string',
			options: {
				list: [
					{ title: 'PDF Document', value: 'pdf' },
					{ title: 'Word Document', value: 'doc' },
					{ title: 'Excel Spreadsheet', value: 'excel' },
					{ title: 'Music Score', value: 'music' },
					{ title: 'Other', value: 'other' }
				]
			}
		}),
		defineField({
			name: 'restricted',
			title: 'Restricted Access',
			type: 'boolean',
			description: 'Should this resource be password-protected or require login?',
			initialValue: false
		}),
		defineField({
			name: 'publishedAt',
			title: 'Published At',
			type: 'datetime',
			initialValue: () => new Date().toISOString()
		})
	],
	preview: {
		select: {
			title: 'title',
			category: 'category',
			restricted: 'restricted'
		},
		prepare({ title, category, restricted }: { title: string; category: 'forms' | 'bible-study' | 'documents' | 'worship' | 'newsletter'; restricted: boolean }) {
			const categories = {
				'forms': 'Ministry Forms',
				'bible-study': 'Bible Study',
				'documents': 'Church Documents',
				'worship': 'Worship',
				'newsletter': 'Newsletter'
			} as const;
			return {
				title,
				subtitle: `${categories[category] || category}${restricted ? ' (Restricted)' : ''}`
			};
		}
	},
	orderings: [
		{
			title: 'Published Date, New',
			name: 'publishedDateDesc',
			by: [{ field: 'publishedAt', direction: 'desc' }]
		}
	]
}); 