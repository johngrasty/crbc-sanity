import {defineType} from 'sanity'
import {Video} from 'lucide-react'
import {editorialIdField} from './editorialId'

export default defineType({
  name: 'mediaItem',
  title: 'Media item',
  type: 'document',
  icon: Video,
  groups: [{name: 'details', title: 'Details', default: true}],
  fields: [{...editorialIdField('mediaItem'), group: 'details'}],
})
