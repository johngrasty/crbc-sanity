import { defineField, defineType } from 'sanity';
import { ClipboardList } from 'lucide-react';

export default defineType({
	name: 'customSignUp',
	title: 'Custom Sign-Ups',
	type: 'document',
	icon: ClipboardList,
	description: 'For PCO People forms or external registration links that are not full events',
	groups: [
		{
			name: 'content',
			title: 'Content',
			default: true
		},
		{
			name: 'settings',
			title: 'Settings'
		}
	],
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			description: 'Name of the sign-up opportunity',
			validation: (Rule) => Rule.required().max(100).warning('Keep titles concise for better display'),
			group: 'content'
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
			rows: 4,
			description: 'Brief description of the sign-up opportunity (recommended: 150-200 characters)',
			validation: (Rule) => Rule.required().max(300).warning('Keep descriptions concise for card display'),
			group: 'content'
		}),
		defineField({
			name: 'category',
			title: 'Category',
			type: 'string',
			description: 'Type of sign-up opportunity',
			options: {
				list: [
					{ title: 'Event', value: 'event' },
					{ title: 'Ministry', value: 'ministry' },
					{ title: 'Volunteer Opportunity', value: 'volunteer' }
				],
				layout: 'radio'
			},
			validation: (Rule) => Rule.required(),
			initialValue: 'event',
			group: 'content'
		}),
		defineField({
			name: 'date',
			title: 'Event/Deadline Date',
			type: 'datetime',
			description: 'Event date or registration deadline (optional - leave blank for ongoing opportunities)',
			group: 'content'
		}),
		defineField({
			name: 'image',
			title: 'Featured Image',
			type: 'image',
			description: 'Image for the sign-up card (recommended: 1200x600px)',
			options: {
				hotspot: true
			},
			fields: [
				{
					name: 'alt',
					title: 'Alt Text',
					type: 'string',
					description: 'Describe the image for accessibility',
					validation: (Rule) => Rule.required()
				}
			],
			group: 'content'
		}),
		defineField({
			name: 'registrationUrl',
			title: 'Registration URL',
			type: 'url',
			description: 'Link to PCO People form or external registration page',
			validation: (Rule) => Rule.required().uri({
				scheme: ['http', 'https'],
				allowRelative: false
			}),
			group: 'content'
		}),
		defineField({
			name: 'active',
			title: 'Active',
			type: 'boolean',
			description: 'Toggle to show/hide this sign-up opportunity on the website',
			initialValue: true,
			group: 'settings'
		}),
		defineField({
			name: 'featured',
			title: 'Featured',
			type: 'boolean',
			description: 'Show on homepage featured events section (in addition to sign-ups page)',
			initialValue: false,
			group: 'settings'
		})
	],
	orderings: [
		{
			title: 'Active First',
			name: 'activeFirst',
			by: [
				{ field: 'active', direction: 'desc' },
				{ field: 'featured', direction: 'desc' },
				{ field: 'date', direction: 'asc' }
			]
		},
		{
			title: 'Date, Newest First',
			name: 'dateDesc',
			by: [{ field: 'date', direction: 'desc' }]
		},
		{
			title: 'Category',
			name: 'category',
			by: [
				{ field: 'category', direction: 'asc' },
				{ field: 'date', direction: 'asc' }
			]
		}
	],
	preview: {
		select: {
			title: 'title',
			category: 'category',
			date: 'date',
			active: 'active',
			featured: 'featured',
			media: 'image'
		},
		prepare(selection) {
			const { title, category, date, active, featured, media } = selection;
			
			// Build status badges
			const badges = [];
			if (featured) badges.push('⭐');
			if (!active) badges.push('💤 Inactive');
			else badges.push('✅ Active');
			
			// Format category
			const categoryMap: Record<string, string> = {
				event: '📅 Event',
				ministry: '⛪ Ministry',
				volunteer: '🤝 Volunteer'
			};
			const categoryLabel = category ? categoryMap[category] || category : '';
			
			// Format date
			const dateText = date 
				? new Date(date).toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric',
						year: 'numeric'
					})
				: 'Ongoing';
			
			return {
				title: `${featured ? '⭐ ' : ''}${title}`,
				subtitle: `${badges.join(' ')} | ${categoryLabel} | ${dateText}`,
				media
			};
		}
	}
});
