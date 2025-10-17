import { EyeOpenIcon } from '@sanity/icons';
import type { DocumentActionComponent } from 'sanity';

export const PreviewAction: DocumentActionComponent = (props) => {
  const { id, type, draft } = props;
  
  // Only show preview for announcement, ministry, article, and page types
  const previewableTypes = ['announcement', 'ministry', 'article', 'page'];
  if (!previewableTypes.includes(type)) {
    return null;
  }

  return {
    label: 'Preview',
    icon: EyeOpenIcon,
    onHandle: () => {
      // Get the slug from the draft or published document
      const doc = draft || props.published;
      const slug = (doc as any)?.slug?.current;
      
      if (!slug) {
        alert('Please add a slug before previewing');
        return;
      }

      const previewUrl = process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:5173';
      const url = `${previewUrl}/api/preview?type=${type}&slug=${slug}`;
      
      // Open preview in new tab
      window.open(url, '_blank');
    }
  };
};
