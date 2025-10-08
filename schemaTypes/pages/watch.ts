import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'watchPage',
	title: 'Watch Page',
	type: 'document',
	groups: [
		{
			name: 'hero',
			title: 'Hero Section'
		},
		{
			name: 'liveStream',
			title: 'Live Stream'
		},
		{
			name: 'socialLinks',
			title: 'Social Media Links'
		},
		{
			name: 'archive',
			title: 'Media Archive'
		},
		{
			name: 'seo',
			title: 'SEO'
		}
	],
	fields: [
		defineField({
			name: 'title',
			title: 'Page Title',
			type: 'string',
			group: 'hero',
			initialValue: 'Watch Online'
		}),
		defineField({
			name: 'hero',
			title: 'Hero Section',
			type: 'object',
			group: 'hero',
			fields: [
				{
					name: 'title',
					title: 'Hero Title',
					type: 'string',
					initialValue: 'Watch Online'
				},
				{
					name: 'description',
					title: 'Hero Description',
					type: 'text',
					rows: 3,
					initialValue: 'Join us for live worship services or catch up on past messages. Experience our services from anywhere, anytime.'
				},
				{
					name: 'backgroundImage',
					title: 'Background Image',
					type: 'image',
					description: 'Optional background image for the hero section',
					options: {
						hotspot: true
					}
				}
			]
		}),
		defineField({
			name: 'liveStream',
			title: 'Live Stream Section',
			type: 'object',
			group: 'liveStream',
			fields: [
				{
					name: 'title',
					title: 'Section Title',
					type: 'string',
					initialValue: 'Live Now'
				},
				{
					name: 'description',
					title: 'Section Description',
					type: 'text',
					rows: 2,
					initialValue: 'Join us live for our worship service. Services are every Sunday at 10:30 AM.'
				},
				{
					name: 'subsplashEmbedCode',
					title: 'Subsplash Embed Code',
					type: 'text',
					rows: 5,
					description: 'Paste the Subsplash live stream embed code here'
				},
				{
					name: 'showWhenOffline',
					title: 'Show Section When Offline',
					type: 'boolean',
					description: 'Show this section even when not streaming live',
					initialValue: true
				}
			]
		}),
		defineField({
			name: 'socialLinks',
			title: 'Social Media Links',
			type: 'object',
			group: 'socialLinks',
			fields: [
				{
					name: 'title',
					title: 'Section Title',
					type: 'string',
					initialValue: 'Watch on Social Media'
				},
				{
					name: 'description',
					title: 'Section Description',
					type: 'text',
					rows: 2,
					initialValue: 'Prefer to watch on your favorite platform? Find us on YouTube and Facebook.'
				},
				{
					name: 'youtubeUrl',
					title: 'YouTube Channel URL',
					type: 'url',
					description: 'Link to your YouTube channel or live stream'
				},
				{
					name: 'facebookUrl',
					title: 'Facebook Page URL',
					type: 'url',
					description: 'Link to your Facebook page or live stream'
				}
			]
		}),
		defineField({
			name: 'archive',
			title: 'Media Archive Section',
			type: 'object',
			group: 'archive',
			fields: [
				{
					name: 'title',
					title: 'Section Title',
					type: 'string',
					initialValue: 'Past Messages'
				},
				{
					name: 'description',
					title: 'Section Description',
					type: 'text',
					rows: 2,
					initialValue: 'Browse our collection of past sermons and messages.'
				},
				{
					name: 'subsplashEmbedCode',
					title: 'Subsplash Archive Embed Code',
					type: 'text',
					rows: 5,
					description: 'Paste the Subsplash media archive embed code here'
				}
			]
		}),
		defineField({
			name: 'seo',
			title: 'SEO Settings',
			type: 'object',
			group: 'seo',
			fields: [
				{
					name: 'title',
					title: 'SEO Title',
					type: 'string',
					description: 'Title for search engines and social media'
				},
				{
					name: 'description',
					title: 'SEO Description',
					type: 'text',
					rows: 3,
					description: 'Description for search engines and social media'
				},
				{
					name: 'image',
					title: 'Social Share Image',
					type: 'image',
					description: 'Image shown when sharing on social media'
				}
			]
		})
	],
	preview: {
		prepare() {
			return {
				title: 'Watch Page'
			};
		}
	}
});
