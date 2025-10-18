import { defineField, defineType } from 'sanity';
import { BellRing } from 'lucide-react';

export default defineType({
	name: 'announcement',
	title: 'Announcements',
	type: 'document',
	icon: BellRing,
	groups: [
		{
			name: 'content',
			title: 'Content',
			default: true
		},
		{
			name: 'settings',
			title: 'Settings'
		},
		{
			name: 'scheduling',
			title: 'Scheduling'
		}
	],
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			description: 'Main headline for the announcement',
			validation: (Rule) => Rule.required().max(100).warning('Keep titles concise for better display'),
			group: 'content'
		}),
		defineField({
			name: 'slug',
			title: 'Slug',
			type: 'slug',
			options: {
				source: 'title',
				maxLength: 96
			},
			validation: (Rule) => Rule.required(),
			group: 'content'
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
			rows: 3,
			description: 'Brief description for carousel display (recommended: 100-150 characters)',
			validation: (Rule) => Rule.required().max(200).warning('Keep descriptions brief for carousel display'),
			group: 'content'
		}),
		defineField({
			name: 'image',
			title: 'Featured Image',
			type: 'image',
			description: 'Image displayed in the carousel (recommended: 1200x600px)',
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
					description: 'Describe the image for screen readers and SEO',
					validation: (Rule) => Rule.required().error('Alt text is required for accessibility')
				}
			],
			group: 'content'
		}),
		defineField({
			name: 'content',
			title: 'Full Content',
			type: 'array',
			description: 'Detailed content if announcement has a dedicated page',
			of: [
				{ type: 'block' },
				{
					type: 'image',
					options: {
						hotspot: true
					}
				}
			],
			group: 'content'
		}),
		defineField({
			name: 'ctaText',
			title: 'Call to Action Text',
			type: 'string',
			description: 'Button text (e.g., "Learn More", "Register Now")',
			placeholder: 'Learn More',
			validation: (Rule) => Rule.max(30),
			group: 'content'
		}),
		defineField({
			name: 'ctaLink',
			title: 'Call to Action Link',
			type: 'url',
			description: 'URL for the call-to-action button (can be relative like /calendar or absolute like https://...)',
			validation: (Rule) => Rule.uri({
				scheme: ['http', 'https', 'mailto', 'tel'],
				allowRelative: true
			}),
			hidden: ({ parent }) => !parent?.ctaText,
			group: 'content'
		}),
		defineField({
			name: 'featured',
			title: 'Featured',
			type: 'boolean',
			description: 'Feature this announcement prominently on the home page',
			initialValue: false,
			group: 'settings'
		}),
		defineField({
			name: 'priority',
			title: 'Priority',
			type: 'number',
			description: 'Display order in carousel (1-10, higher numbers appear first)',
			initialValue: 5,
			validation: (Rule) => Rule.required().min(1).max(10).integer(),
			group: 'settings'
		}),
		defineField({
			name: 'active',
			title: 'Active',
			type: 'boolean',
			description: 'Toggle to show/hide this announcement immediately',
			initialValue: true,
			group: 'settings'
		}),
		defineField({
			name: 'startDate',
			title: 'Start Date',
			type: 'datetime',
			description: 'When this announcement should start being displayed',
			initialValue: () => new Date().toISOString(),
			validation: (Rule) => Rule.required(),
			group: 'scheduling'
		}),
		defineField({
			name: 'endDate',
			title: 'End Date',
			type: 'datetime',
			description: 'When this announcement should stop being displayed (optional)',
			validation: (Rule) => Rule.min(Rule.valueOfField('startDate')).error('End date must be after start date'),
			group: 'scheduling'
		})
	],
	orderings: [
		{
			title: 'Priority, High to Low',
			name: 'priorityDesc',
			by: [{ field: 'priority', direction: 'desc' }]
		},
		{
			title: 'Start Date, Newest First',
			name: 'startDateDesc',
			by: [{ field: 'startDate', direction: 'desc' }]
		},
		{
			title: 'Active First',
			name: 'activeFirst',
			by: [
				{ field: 'active', direction: 'desc' },
				{ field: 'priority', direction: 'desc' }
			]
		}
	],
	preview: {
		select: {
			title: 'title',
			description: 'description',
			active: 'active',
			priority: 'priority',
			featured: 'featured',
			startDate: 'startDate',
			endDate: 'endDate',
			ctaText: 'ctaText',
			media: 'image'
		},
		prepare(selection) {
			const { title, description, active, priority, featured, startDate, endDate, ctaText, media } = selection;
			const now = new Date();
			const start = startDate ? new Date(startDate) : null;
			const end = endDate ? new Date(endDate) : null;
			
			// Determine status
			let status = '';
			if (!active) {
				status = '⏸️ Inactive';
			} else if (start && start > now) {
				status = '⏰ Scheduled';
			} else if (end && end < now) {
				status = '⏹️ Expired';
			} else {
				status = '✅ Active';
			}
			
			const featuredBadge = featured ? '⭐ ' : '';
			const priorityText = `P${priority || 5}`;
			
			return {
				title: `${featuredBadge}${title}`,
				subtitle: `${status} | ${priorityText} | ${description?.substring(0, 60) || ''}${description?.length > 60 ? '...' : ''}`,
				media
			};
		}
	}
}); 