import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'designTokens',
	title: 'Design Tokens',
	type: 'document',
	groups: [
		{
			name: 'colors',
			title: 'Colors'
		},
		{
			name: 'gradients',
			title: 'Gradients'
		},
		{
			name: 'typography',
			title: 'Typography'
		}
	],
	fields: [
		defineField({
			name: 'colors',
			title: 'Brand Colors',
			type: 'object',
			group: 'colors',
			description: 'Define the primary colors used throughout the site',
			fields: [
				{
					name: 'primary',
					title: 'Primary Color',
					type: 'string',
					description: 'Main brand color (hex code with optional #, e.g. 801423 or #801423)',
					initialValue: '801423'
				},
				{
					name: 'secondary',
					title: 'Secondary Color',
					type: 'string',
					description: 'Secondary brand color',
					initialValue: '4a5568'
				}
			]
		}),
		defineField({
			name: 'gradients',
			title: 'Gradient Settings',
			type: 'object',
			group: 'gradients',
			description: 'Define the gradient colors used throughout the site',
			fields: [
				{
					name: 'primary',
					title: 'Primary Gradient',
					type: 'object',
					description: 'Colors for the primary section gradient',
					fields: [
						{
							name: 'from',
							title: 'From Color',
							type: 'string',
							description: 'Starting color (hex code with optional #, e.g. fff1be or #fff1be)',
							initialValue: 'fff1be'
						},
						{
							name: 'via',
							title: 'Via Color',
							type: 'string',
							description: 'Middle color (hex code with optional #, e.g. ee87cb or #ee87cb)',
							initialValue: 'ee87cb'
						},
						{
							name: 'to',
							title: 'To Color',
							type: 'string',
							description: 'Ending color (hex code with optional #, e.g. b060ff or #b060ff)',
							initialValue: 'b060ff'
						}
					]
				},
				{
					name: 'footer',
					title: 'Footer Gradient',
					type: 'object',
					description: 'Colors for the footer section gradient',
					fields: [
						{
							name: 'from',
							title: 'From Color',
							type: 'string',
							description: 'Starting color (hex code with optional #, e.g. fff1be or #fff1be)',
							initialValue: 'fff1be'
						},
						{
							name: 'via',
							title: 'Via Color',
							type: 'string',
							description: 'Middle color (hex code with optional #, e.g. ee87cb or #ee87cb)',
							initialValue: 'ee87cb'
						},
						{
							name: 'to',
							title: 'To Color',
							type: 'string',
							description: 'Ending color (hex code with optional #, e.g. b060ff or #b060ff)',
							initialValue: 'b060ff'
						}
					]
				}
			]
		}),
		defineField({
			name: 'typography',
			title: 'Typography Settings',
			type: 'object',
			group: 'typography',
			description: 'Define typography-related settings',
			fields: [
				{
					name: 'headingFont',
					title: 'Heading Font',
					type: 'string',
					description: 'Font family for headings',
					initialValue: 'General Sans'
				},
				{
					name: 'bodyFont',
					title: 'Body Font',
					type: 'string',
					description: 'Font family for body text',
					initialValue: 'General Sans'
				}
			]
		})
	],
	preview: {
		prepare() {
			return {
				title: 'Design Tokens'
			};
		}
	}
});
