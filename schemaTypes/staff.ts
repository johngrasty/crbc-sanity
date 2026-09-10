import { defineField, defineType } from 'sanity';
import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list';

export default defineType({
	name: 'staff',
	title: 'Staff & Leadership',
	type: 'document',
	fields: [
		defineField({
			name: 'name',
			title: 'Name',
			type: 'string',
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'role',
			title: 'Role/Title',
			type: 'string',
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'category',
			title: 'Category',
			type: 'string',
			options: {
				list: [
					{ title: 'Pastoral Staff', value: 'pastoral' },
					{ title: 'Ministry Staff', value: 'ministry' },
					{ title: 'Support Staff', value: 'support' },
					{ title: 'Deacons', value: 'deacons' }
				]
			},
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'image',
			title: 'Profile Image',
			type: 'image',
			options: {
				hotspot: true,
				aiAssist: {
					imageDescriptionField: 'alt'
				}
			},
			fields: [
				{
					name: 'alt',
					type: 'string',
					title: 'Alternative Text',
					description: 'Describe the person (10-125 characters). Example: "Professional portrait of John Smith". Use AI Assist (✨) to generate. See ALT_TEXT_GUIDE.md.',
					validation: (Rule) => Rule.required().min(10).max(125).error('Alt text is required (10-125 characters) for accessibility')
				}
			]
		}),
		defineField({
			name: 'shortBio',
			title: 'Short Bio',
			type: 'text',
			description: 'Brief 2-3 line biography for team listings',
			rows: 3
		}),
		defineField({
			name: 'bio',
			title: 'Full Biography',
			type: 'array',
			of: [{ type: 'block' }],
			description: 'Detailed biography for individual staff pages'
		}),
		defineField({
			name: 'email',
			title: 'Email',
			type: 'string'
		}),
		defineField({
			name: 'phone',
			title: 'Phone',
			type: 'string'
		}),
		// Set by drag-and-drop in the Staff & Leadership lists; hidden from the form.
		orderRankField({ type: 'staff' }),
		defineField({
			name: 'isActive',
			title: 'Active',
			type: 'boolean',
			description: 'Uncheck to hide this staff member from the website',
			initialValue: true
		})
	],
	orderings: [
		orderRankOrdering,
		{
			title: 'Category, then display order',
			name: 'categoryOrder',
			by: [
				{ field: 'category', direction: 'asc' },
				{ field: 'orderRank', direction: 'asc' },
				{ field: 'name', direction: 'asc' }
			]
		}
	],
	preview: {
		select: {
			title: 'name',
			subtitle: 'role',
			media: 'image'
		}
	}
}); 