import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'calendarPage',
	title: 'Calendar Page',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Page Title',
			type: 'string',
			initialValue: 'Church Calendar',
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'seo',
			title: 'SEO Settings',
			type: 'object',
			fields: [
				defineField({
					name: 'title',
					title: 'SEO Title',
					type: 'string',
					initialValue: 'Calendar'
				}),
				defineField({
					name: 'description',
					title: 'SEO Description',
					type: 'text',
					rows: 2,
					initialValue:
						'View upcoming events and activities at Calvary Road Baptist Church'
				})
			]
		}),
		defineField({
			name: 'heading',
			title: 'Page Heading',
			type: 'string',
			initialValue: 'Church Calendar',
			validation: (Rule) => Rule.required()
		}),
		defineField({
			name: 'lead',
			title: 'Lead Text',
			type: 'text',
			rows: 2,
			initialValue:
				'Stay connected with all the events and activities happening at Calvary Road Baptist Church.'
		}),
		defineField({
			name: 'showNewsletterCta',
			title: 'Show Newsletter CTA',
			type: 'boolean',
			description: 'Display the newsletter signup CTA from the Connect page',
			initialValue: false
		}),
		defineField({
			name: 'showSmsCta',
			title: 'Show SMS CTA',
			type: 'boolean',
			description: 'Display the SMS signup CTA from the Connect page',
			initialValue: false
		})
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'heading'
		},
		prepare({ title, subtitle }) {
			return {
				title: title || 'Calendar Page',
				subtitle: subtitle || 'Church Calendar'
			};
		}
	}
});
