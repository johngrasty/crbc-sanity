import {EyeOpenIcon} from '@sanity/icons'
import {useClient, type DocumentActionComponent} from 'sanity'
import {createDocumentPreviewUrl, documentSlug, previewableTypes} from './preview'

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
