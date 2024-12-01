import { defineType } from 'sanity';

export default defineType({
	name: 'richText',
	title: 'Rich Text',
	type: 'array',
	of: [
		{
			type: 'block',
			styles: [
				{ title: 'Normal', value: 'normal' },
				{ title: 'Heading 2', value: 'h2' },
				{ title: 'Heading 3', value: 'h3' },
				{ title: 'Heading 4', value: 'h4' },
				{ title: 'Quote', value: 'blockquote' }
			],
			lists: [
				{ title: 'Bullet', value: 'bullet' },
				{ title: 'Numbered', value: 'number' }
			],
			marks: {
				decorators: [
					{ title: 'Strong', value: 'strong' },
					{ title: 'Emphasis', value: 'em' },
					{ title: 'Underline', value: 'underline' },
					{ title: 'Strike', value: 'strike-through' },
					{ title: 'Code', value: 'code' }
				],
				annotations: [
					{
						name: 'link',
						type: 'object',
						title: 'Link',
						fields: [
							{
								name: 'href',
								type: 'string',
								title: 'URL',
								validation: (Rule) => Rule.required()
							},
							{
								name: 'isExternal',
								type: 'boolean',
								title: 'Open in new tab',
								initialValue: false
							}
						]
					},
					{
						name: 'internalLink',
						type: 'object',
						title: 'Internal Link',
						fields: [
							{
								name: 'reference',
								type: 'reference',
								title: 'Reference',
								to: [
									{ type: 'page' },
									{ type: 'article' }
								],
								validation: (Rule) => Rule.required()
							}
						]
					}
				]
			}
		},
		{
			type: 'image',
			options: {
				hotspot: true
			},
			fields: [
				{
					name: 'alt',
					type: 'string',
					title: 'Alt Text',
					description: 'Alternative text for screen readers',
					validation: (Rule) => Rule.required()
				},
				{
					name: 'caption',
					type: 'string',
					title: 'Caption',
					description: 'Optional caption to display below the image'
				}
			]
		},
		{
			type: 'object',
			name: 'scripture',
			title: 'Scripture Reference',
			fields: [
				{
					name: 'reference',
					type: 'string',
					title: 'Reference',
					description: 'e.g., "John 3:16" or "Psalm 23"',
					validation: (Rule) => Rule.required()
				},
				{
					name: 'translation',
					type: 'string',
					title: 'Translation',
					options: {
						list: [
							{ title: 'ESV', value: 'ESV' },
							{ title: 'NIV', value: 'NIV' },
							{ title: 'KJV', value: 'KJV' },
							{ title: 'NKJV', value: 'NKJV' },
							{ title: 'CSB', value: 'CSB' }
						]
					},
					initialValue: 'NKJV'
				},
				{
					name: 'text',
					type: 'text',
					title: 'Verse Text',
					description: 'Optional: Paste the verse text here',
					rows: 3
				}
			],
			preview: {
				select: {
					reference: 'reference',
					translation: 'translation'
				},
				prepare({ reference, translation }) {
					return {
						title: reference,
						subtitle: `Scripture (${translation})`
					};
				}
			}
		},
		{
			type: 'object',
			name: 'callout',
			title: 'Callout Box',
			fields: [
				{
					name: 'style',
					type: 'string',
					title: 'Style',
					options: {
						list: [
							{ title: 'Info', value: 'info' },
							{ title: 'Warning', value: 'warning' },
							{ title: 'Success', value: 'success' },
							{ title: 'Note', value: 'note' }
						]
					},
					initialValue: 'info'
				},
				{
					name: 'content',
					type: 'array',
					title: 'Content',
					of: [{ type: 'block' }]
				}
			],
			preview: {
				select: {
					style: 'style'
				},
				prepare(selection: Record<string, any>) {
					const style = selection.style as 'info' | 'warning' | 'success' | 'note';
					const titles = {
						info: 'Info Callout',
						warning: 'Warning Callout',
						success: 'Success Callout',
						note: 'Note Callout'
					} as const;
					return {
						title: titles[style] || 'Callout'
					};
				}
			}
		}
	]
}); 