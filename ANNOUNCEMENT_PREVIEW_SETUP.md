# Announcement Preview Setup Guide

This document explains how the announcement preview system works and how to set it up.

## Overview

The announcement management interface includes a powerful preview system that allows church staff to see exactly how announcements will appear on the website before publishing them. This helps ensure content looks correct and prevents mistakes from going live.

## Features

### 1. Preview Button
- Located in the document toolbar (top right) when editing an announcement
- Opens a new browser tab showing the announcement as it will appear on the live website
- Works for both draft and published announcements
- Requires a slug to be set before previewing

### 2. Preview Mode Banner
- Yellow banner appears at the top of previewed pages
- Clearly indicates you're viewing a preview, not the live site
- Includes an "Exit Preview" button to return to normal viewing

### 3. Draft Content Preview
- Preview drafts before publishing to see changes
- Make edits in Sanity Studio and refresh the preview tab to see updates
- No need to publish to see how content will look

## Technical Setup

### Environment Variables

The preview system requires the following environment variables:

**In `studio-crbc/.env`:**
```
SANITY_STUDIO_PREVIEW_URL="http://localhost:5173"
```
For production, set this to your live website URL (e.g., "https://yourchurch.org")

**In `crbc-new-site/.env`:**
```
SANITY_API_WRITE_TOKEN="your-write-token-here"
```
This token allows the preview system to fetch draft content from Sanity.

### How It Works

1. **Preview Button Click**: When staff clicks the Preview button in Sanity Studio, it opens a URL like:
   ```
   https://yoursite.com/api/preview?type=announcement&slug=easter-service
   ```

2. **Preview API**: The `/api/preview` endpoint:
   - Sets a preview mode cookie
   - Redirects to the announcement page

3. **Page Load**: The announcement page:
   - Checks for the preview cookie
   - If present, fetches draft content using the write token
   - If not present, fetches published content normally
   - Shows the preview banner when in preview mode

4. **Exit Preview**: Clicking "Exit Preview":
   - Clears the preview cookie
   - Returns to normal viewing mode

## Security Considerations

- Preview mode uses HTTP-only cookies for security
- The write token is only used server-side, never exposed to the browser
- Preview cookies expire after 1 hour
- Only authenticated Sanity Studio users can trigger preview mode

## Troubleshooting

### Preview button doesn't appear
- Make sure you're editing an announcement (not viewing the list)
- Check that the document has a slug field

### Preview shows 404 error
- Verify the slug is set correctly
- Check that `SANITY_STUDIO_PREVIEW_URL` is configured
- Ensure the website is running (for local development)

### Preview shows published content instead of draft
- Verify `SANITY_API_WRITE_TOKEN` is set in the website's `.env` file
- Check that the token has read permissions for drafts
- Clear your browser cookies and try again

### Changes don't appear in preview
- Refresh the preview browser tab after making changes
- Wait a few seconds for Sanity to process the changes
- Check the browser console for any errors

## For Developers

### Adding Preview to Other Content Types

To add preview functionality to other content types (like ministries or articles):

1. The preview action is already configured for: `announcement`, `ministry`, `article`, `page`

2. Add a preview fetch function in `crbc-new-site/src/lib/server/sanity.server.ts`:
   ```typescript
   export async function fetchMinistryPreview(slug: string) {
     try {
       const client = getPreviewClient();
       const data = await client.fetch(ministryQuery(slug).query);
       return data;
     } catch (err) {
       console.error('Sanity preview query error:', err);
       return null;
     }
   }
   ```

3. Update the page's `+page.server.ts` to check for preview mode:
   ```typescript
   export const load: PageServerLoad = async ({ params, cookies }) => {
     const isPreview = cookies.get('preview') === 'true';
     const ministry = isPreview 
       ? await fetchMinistryPreview(params.slug)
       : await fetchMinistry(params.slug);
     
     return { ministry, isPreview };
   };
   ```

4. Add the preview banner to the page's `+page.svelte`

### API Endpoints

- `/api/preview` - Enters preview mode and redirects to content
- `/api/exit-preview` - Exits preview mode and returns to normal viewing

## Best Practices

1. **Always preview before publishing** - Catch errors before they go live
2. **Test on mobile** - Use browser dev tools to preview on different screen sizes
3. **Check all links** - Click through CTAs and links in preview mode
4. **Verify images** - Ensure images load and display correctly
5. **Exit preview when done** - Don't leave preview mode active

## Support

For technical issues with the preview system, contact the web development team.
For help using the preview feature, see the main ANNOUNCEMENT_MANAGEMENT_GUIDE.md.
