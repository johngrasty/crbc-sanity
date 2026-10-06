import {EyeOpenIcon} from '@sanity/icons'
import {useToast} from '@sanity/ui'
import {Copy} from 'lucide-react'
import {useState} from 'react'
import {getPublishedId, useClient, type DocumentActionComponent} from 'sanity'
import {useRouter} from 'sanity/router'
import {duplicateWithFreshIds} from '../schemaTypes/media/duplicate'
import {createDocumentPreviewUrl, documentSlug, previewableTypes} from './preview'

// Stands in for Sanity's Duplicate on the editorial types. The operation does the work, so the
// harness tests what this action does. This shell only opens the copy.
export const FreshIdDuplicateAction: DocumentActionComponent = (props) => {
  const client = useClient({apiVersion: '2025-02-19'})
  const {navigateIntent} = useRouter()
  const toast = useToast()
  const [duplicating, setDuplicating] = useState(false)
  const source = props.version ?? props.draft ?? props.published
  return {
    label: duplicating ? 'Duplicating…' : 'Duplicate',
    icon: Copy,
    disabled: duplicating || !props.ready || !source,
    title: source ? undefined : "This document hasn't been saved yet, so there's nothing to copy.",
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
