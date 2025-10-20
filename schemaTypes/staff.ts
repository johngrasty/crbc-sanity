import { defineField, defineType } from 'sanity';

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
			name: 'slug',
			title: 'Slug',
			type: 'slug',
			options: {
				source: 'name'
			},
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
		defineField({
			name: 'order',
			title: 'Display Order',
			type: 'number',
			description: 'Used to control the order of staff members within their category'
		}),
		defineField({
			name: 'isActive',
			title: 'Active',
			type: 'boolean',
			description: 'Uncheck to hide this staff member from the website',
			initialValue: true
		})
	],
	orderings: [
		{
			title: 'Category, Display Order',
			name: 'categoryOrder',
			by: [
				{ field: 'category', direction: 'asc' },
				{ field: 'order', direction: 'asc' },
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