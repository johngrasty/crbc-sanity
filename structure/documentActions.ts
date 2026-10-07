import {EyeOpenIcon} from '@sanity/icons'
import {useToast} from '@sanity/ui'
import {Copy} from 'lucide-react'
import {useState} from 'react'
import {getPublishedId, useClient, type DocumentActionComponent} from 'sanity'
import {useRouter} from 'sanity/router'
import {duplicateWithFreshIds} from '../schemaTypes/media/duplicate'
import {createDocumentPreviewUrl, documentSlug, previewableTypes} from './preview'

// Stands in for Sanity's Duplicate on the editorial types. duplicateWithFreshIds makes the copy,
// and the harness tests it there. This shell only picks the source and opens the copy. The copy
// is a draft even with a release pinned, so it opens outside that release.
export const FreshIdDuplicateAction: DocumentActionComponent = (props) => {
  const client = useClient({apiVersion: '2025-02-19'})
  const {navigateIntent} = useRouter()
  const toast = useToast()
  const [duplicating, setDuplicating] = useState(false)
  // As Sanity's Duplicate does: the open release version, else the draft, else the published one.
  const source = props.version ?? props.draft ?? props.published
  return {
    label: duplicating ? 'Duplicating…' : 'Duplicate',
    icon: Copy,
    disabled: duplicating || !props.ready || !source,
    title:
      props.ready && !source
        ? "This document hasn't been saved yet, so there's nothing to copy."
        : undefined,
    onHandle: async () => {
      if (!source) return
      setDuplicating(true)
      try {
        const copy = await duplicateWithFreshIds(client, source)
        navigateIntent('edit', {id: getPublishedId(copy._id), type: copy._type})
      } catch (error) {
        toast.push({
          status: 'error',
          title: "The copy couldn't be made",
          description: error instanceof Error ? error.message : undefined,
        })
      } finally {
        setDuplicating(false)
      }
    },
  }
}
// Sanity's name for Duplicate. Sanity copies it into the action's state, and its Canvas guard
// disables any action without a name it knows on a document linked to Canvas.
FreshIdDuplicateAction.action = 'duplicate'
FreshIdDuplicateAction.displayName = 'FreshIdDuplicateAction'

export const PreviewAction: DocumentActionComponent = (props) => {
  const client = useClient({apiVersion: '2025-02-19'})
  if (!previewableTypes.has(props.type)) return null

  const document = props.draft || props.published
  return {
    label: 'Preview',
    icon: EyeOpenIcon,
    disabled: !documentSlug(document),
    onHandle: async () => {
      if (!document) return
      // Open while handling the click so browsers allow the new tab.
      const tab = window.open('about:blank', '_blank')
      if (tab) tab.opener = null
      try {
        const url = await createDocumentPreviewUrl(client, document)
        if (tab) tab.location.replace(url)
        else window.location.assign(url)
      } catch {
        tab?.close()
        window.alert('Preview could not be opened. Check your Sanity connection and permissions.')
      } finally {
        props.onComplete()
      }
    },
  }
}
