import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'servicesPage',
	title: 'Services Page',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Page Title',
			type: 'string',
			initialValue: 'Services & Schedule',
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
					initialValue: 'Services & Schedule'
				}),
				defineField({
					name: 'description',
					title: 'SEO Description',
					type: 'text',
					rows: 2,
					initialValue:
						'Join us for worship, Bible study, and fellowship. View our complete weekly schedule of services and programs at Calvary Road Baptist Church.'
				})
			]
		}),
		defineField({
			name: 'hero',
			title: 'Hero Section',
			type: 'object',
			fields: [
				defineField({
					name: 'badge',
					title: 'Badge Text',
					type: 'string',
					description: 'Small text above the main title',
					initialValue: 'Join us every week for worship and fellowship.'
				}),
				defineField({
					name: 'badgeLink',
					title: 'Badge Link',
					type: 'object',
					description: 'Optional link that appears after the badge text',
					fields: [
						defineField({
							name: 'text',
							title: 'Link Text',
							type: 'string',
							description: 'Text for the link (e.g., "Watch Online")'
						}),
						defineField({
							name: 'url',
							title: 'Link URL',
							type: 'string',
							description: 'URL for the link (e.g., "/watch")'
						})
					]
				}),
				defineField({
					name: 'title',
					title: 'Main Title',
					type: 'string',
					initialValue: 'Gather. Grow. Go.',
					validation: (Rule) => Rule.required()
				}),
				defineField({
					name: 'description',
					title: 'Description',
					type: 'text',
					rows: 3,
					initialValue:
						"Whether you're looking for Sunday worship, midweek Bible study, or opportunities to serve, we have a place for you. Explore our weekly schedule and find where you fit.",
					validation: (Rule) => Rule.required()
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
							initialValue: 'View schedule'
						}),
						defineField({
							name: 'href',
							title: 'Button URL',
							type: 'string',
							initialValue: '#schedule'
						})
					]
				}),
				defineField({
					name: 'secondaryButton',
					title: 'Secondary Button',
					type: 'object',
					fields: [
						defineField({
							name: 'text',
							title: 'Button Text',
							type: 'string',
							initialValue: 'Plan your visit'
						}),
						defineField({
							name: 'href',
							title: 'Button URL',
							type: 'string',
							initialValue: '/visit'
						})
					]
				}),
				defineField({
					name: 'image',
					title: 'Hero Image',
					type: 'image',
					options: {
						hotspot: true,
						aiAssist: {
							imageDescriptionField: 'alt'
						}
					},
					fields: [
						defineField({
							name: 'alt',
							title: 'Alt Text',
							type: 'string',
							description:
								'Describe the specific image used (10-125 characters). Be specific, not generic. Use AI Assist (✨) to generate. See ALT_TEXT_GUIDE.md.',
							validation: (Rule) =>
								Rule.required()
									.min(10)
									.max(125)
									.error('Alt text is required (10-125 characters) for accessibility')
						})
					],
					validation: (Rule) => Rule.required()
				})
			]
		}),
		defineField({
			name: 'schedule',
			title: 'Schedule Section',
			type: 'object',
			description: 'Service times are pulled from Settings. This section controls the heading text.',
			fields: [
				defineField({
					name: 'eyebrow',
					title: 'Eyebrow Text',
					type: 'string',
					initialValue: 'Weekly Schedule'
				}),
				defineField({
					name: 'title',
					title: 'Section Title',
					type: 'string',
					initialValue: 'Join us throughout the week'
				})
			]
		}),
		defineField({
			name: 'ministries',
			title: 'Ministry Programs Section',
			type: 'object',
			fields: [
				defineField({
					name: 'title',
					title: 'Section Title',
					type: 'string',
					initialValue: 'Explore Our Ministries'
				}),
				defineField({
					name: 'description',
					title: 'Section Description',
					type: 'text',
					rows: 2,
					initialValue:
						'Find the right program for you and your family. We offer classes, groups, and activities for all ages.'
				}),
				defineField({
					name: 'programs',
					title: 'Ministry Programs',
					type: 'array',
					of: [
						{
							type: 'object',
							fields: [
								defineField({
									name: 'title',
									title: 'Program Title',
									type: 'string',
									validation: (Rule) => Rule.required()
								}),
								defineField({
									name: 'description',
									title: 'Short Description',
									type: 'text',
									rows: 2,
									validation: (Rule) => Rule.required()
								}),
								defineField({
									name: 'link',
									title: 'Link URL',
									type: 'string',
									description: 'Link to ministry page or external resource',
									validation: (Rule) => Rule.required()
								}),
								defineField({
									name: 'linkText',
									title: 'Link Text',
									type: 'string',
									initialValue: 'Learn more'
								}),
								defineField({
									name: 'icon',
									title: 'Icon',
									type: 'string',
									description: 'Icon name (book, users, smile, zap, etc.)',
									initialValue: 'book'
								})
							],
							preview: {
								select: {
									title: 'title',
									subtitle: 'description'
								}
							}
						}
					],
					initialValue: [
						{
							title: 'Life Groups',
							description:
								"Sunday morning Bible study classes for all ages. Dive deeper into God's Word.",
							link: '/ministries/life-groups',
							linkText: 'View classes',
							icon: 'book'
						},
						{
							title: 'Community Groups',
							description:
								'Small groups meeting throughout the week for fellowship, prayer, and study.',
							link: '/ministries/community-groups',
							linkText: 'Find a group',
							icon: 'users'
						},
						{
							title: 'Kids Ministry',
							description:
								'Safe, fun, and age-appropriate programs for children from nursery through elementary.',
							link: '/ministries/kids',
							linkText: 'Learn more',
							icon: 'smile'
						},
						{
							title: 'Student Ministry',
							description:
								'Middle and high school programs designed to help students grow in their faith.',
							link: '/ministries/students',
							linkText: 'Learn more',
							icon: 'zap'
						}
					],
					validation: (Rule) => Rule.min(1).error('Add at least one ministry program')
				})
			]
		}),
		defineField({
			name: 'cta',
			title: 'Call to Action Section',
			type: 'object',
			fields: [
				defineField({
					name: 'title',
					title: 'CTA Title',
					type: 'string',
					initialValue: 'Have questions?',
					validation: (Rule) => Rule.required()
				}),
				defineField({
					name: 'description',
					title: 'CTA Description',
					type: 'text',
					rows: 3,
					initialValue:
						"We'd love to help you find the right service or program for you and your family. Our team is here to answer any questions you might have.",
					validation: (Rule) => Rule.required()
				}),
				defineField({
					name: 'image',
					title: 'CTA Image',
					type: 'image',
					options: {
						hotspot: true,
						aiAssist: {
							imageDescriptionField: 'alt'
						}
					},
					fields: [
						defineField({
							name: 'alt',
							title: 'Alt Text',
							type: 'string',
							description:
								'Describe the specific image used (10-125 characters). Be specific, not generic. Use AI Assist (✨) to generate. See ALT_TEXT_GUIDE.md.',
							validation: (Rule) =>
								Rule.required()
									.min(10)
									.max(125)
									.error('Alt text is required (10-125 characters) for accessibility')
						})
					],
					validation: (Rule) => Rule.required()
				}),
				defineField({
					name: 'benefits',
					title: 'Benefits List',
					type: 'array',
					of: [{ type: 'string' }],
					initialValue: [
						'Friendly staff ready to help',
						'Programs for all ages',
						'Welcoming community',
						'Casual, comfortable atmosphere',
						'Biblical teaching',
						'Opportunities to serve'
					],
					validation: (Rule) => Rule.min(1).error('Add at least one benefit')
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
							initialValue: 'Contact us'
						}),
						defineField({
							name: 'href',
							title: 'Button URL',
							type: 'string',
							initialValue: '/connect'
						})
					]
				}),
				defineField({
					name: 'secondaryButton',
					title: 'Secondary Button',
					type: 'object',
					fields: [
						defineField({
							name: 'text',
							title: 'Button Text',
							type: 'string',
							initialValue: 'Plan your visit'
						}),
						defineField({
							name: 'href',
							title: 'Button URL',
							type: 'string',
							initialValue: '/visit'
						})
					]
				})
			]
		})
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'hero.title'
		},
		prepare({ title, subtitle }) {
			return {
				title: title || 'Services Page',
				subtitle: subtitle || 'Gather. Grow. Go.'
			};
		}
	}
});
