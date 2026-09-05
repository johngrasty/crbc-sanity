import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'pcoSettings',
	title: 'Planning Center Settings',
	description: 'Website credentials belong in the server environment, never in Sanity documents. These legacy settings do not configure the current website integration.',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			initialValue: 'Planning Center Online Settings',
			readOnly: true
		}),
		defineField({
			name: 'organizationId',
			title: 'Organization ID',
			type: 'string',
			description: 'Your Planning Center Online Organization ID'
		}),
		defineField({
			name: 'enabledProducts',
			title: 'Enabled PCO Products',
			type: 'array',
			of: [
				{
					type: 'string',
					options: {
						list: [
							{ title: 'Calendar', value: 'calendar' },
							{ title: 'Registrations', value: 'registrations' },
							{ title: 'Check-Ins', value: 'check-ins' },
							{ title: 'Giving', value: 'giving' },
							{ title: 'People', value: 'people' },
							{ title: 'Services', value: 'services' }
						]
					}
				}
			],
			description: 'Which Planning Center products to integrate with',
			initialValue: ['calendar', 'registrations']
		}),
		defineField({
			name: 'cacheTimeout',
			title: 'Cache Timeout (seconds)',
			type: 'number',
			description: 'How long to cache PCO API responses (in seconds)',
			initialValue: 300,
			validation: (Rule) => Rule.min(60).max(3600)
		}),
		defineField({
			name: 'testMode',
			title: 'Test Mode',
			type: 'boolean',
			description: 'Enable test mode for development (uses sandbox data)',
			initialValue: false
		}),
	],
	preview: {
		select: {
			title: 'title',
			enabledProducts: 'enabledProducts',
			testMode: 'testMode'
		},
		prepare({ title, enabledProducts, testMode }) {
			const productCount = enabledProducts ? enabledProducts.length : 0;
			const modeIcon = testMode ? '🧪' : '🔴';
			
			return {
				title,
				subtitle: `${modeIcon} ${productCount} products enabled`
			};
		}
	}
});