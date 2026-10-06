import {defineField, defineType} from 'sanity'
import {SlidersHorizontal} from 'lucide-react'

export default defineType({
  name: 'mediaSettings',
  title: 'Media settings',
  type: 'document',
  icon: SlidersHorizontal,
  fields: [
    defineField({
      name: 'socialTitleTemplate',
      title: 'YouTube and Facebook title',
      type: 'string',
    }),
    defineField({
      name: 'socialDescriptionFooter',
      title: 'Description footer',
      type: 'text',
      rows: 4,
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Media settings'}
    },
  },
})
