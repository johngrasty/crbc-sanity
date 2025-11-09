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
			name: 'cta',
			title: 'Registration CTA',
			type: 'object',
			description: 'Call-to-action section that appears below featured events',
			fields: [
				defineField({
					name: 'heading',
					title: 'CTA Heading',
					type: 'string',
					initialValue: 'Want to register for an event?'
				}),
				defineField({
					name: 'subheading',
					title: 'CTA Subheading',
					type: 'string',
					initialValue: 'Click any event above to sign up.'
				}),
				defineField({
					name: 'primaryButton',
					title: 'Primary Button',
					type: 'object',
					fields: [
						defineField({
							name: 'text',
							title: 'Button Text',
							type: 'string',
							initialValue: 'View All Sign-Ups'
						}),
						defineField({
							name: 'href',
							title: 'Button URL',
							type: 'string',
							initialValue: '/sign-ups'
						})
					]
				}),
				defineField({
					name: 'secondaryButton',
					title: 'Secondary Link',
					type: 'object',
					fields: [
						defineField({
							name: 'text',
							title: 'Link Text',
							type: 'string',
							initialValue: 'Contact Us'
						}),
						defineField({
							name: 'href',
							title: 'Link URL',
							type: 'string',
							initialValue: '/connect'
						})
					]
				})
			]
		}),
		defineField({
			name: 'photoCta',
			title: 'Two-Column Photo CTA',
			type: 'object',
			description: 'Call-to-action section with photo and feature list',
			fields: [
				defineField({
					name: 'heading',
					title: 'Heading',
					type: 'string',
					initialValue: 'Get Involved in Ministry'
				}),
				defineField({
					name: 'description',
					title: 'Description',
					type: 'text',
					rows: 3,
					initialValue: 'Discover opportunities to serve and grow in your faith through our various ministries and programs.'
				}),
				defineField({
					name: 'features',
					title: 'Features',
					type: 'array',
					of: [{ type: 'string' }],
					initialValue: [
						'Weekly Bible studies',
						'Community outreach programs',
						'Youth and children\'s ministries',
						'Worship team opportunities',
						'Prayer groups',
						'Service projects'
					]
				}),
				defineField({
					name: 'linkText',
					title: 'Link Text',
					type: 'string',
					initialValue: 'Explore ministries'
				}),
				defineField({
					name: 'linkHref',
					title: 'Link URL',
					type: 'string',
					initialValue: '/ministries'
				}),
				defineField({
					name: 'image',
					title: 'Image',
					type: 'image',
					options: {
						hotspot: true
					},
					fields: [
						defineField({
							name: 'alt',
							title: 'Alt Text',
							type: 'string',
							validation: (Rule) => Rule.required()
						})
					]
				})
			]
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
