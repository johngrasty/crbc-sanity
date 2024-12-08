import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'page',
	title: 'Page',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			validation: Rule => Rule.required()
		}),
		defineField({
			name: 'slug',
			title: 'Slug',
			type: 'slug',
			options: {
				source: 'title'
			},
			validation: Rule => Rule.required()
		}),
		defineField({
			name: 'hero',
			title: 'Hero Section',
			type: 'hero'
		}),
		defineField({
			name: 'seo',
			title: 'SEO',
			type: 'seo'
		})
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'slug.current'
		}
	}
}); 