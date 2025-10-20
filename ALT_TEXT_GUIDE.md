# Alt Text Guidelines for Content Editors

## Overview

Alt text (alternative text) is a written description of an image that appears when the image can't be displayed and is read aloud by screen readers for visually impaired users. Good alt text is essential for accessibility, SEO, and user experience.

## ⚠️ First-Time Setup (Admin Only)

**Before anyone can use AI Assist, an admin must enable it once:**

1. Open Sanity Studio
2. Open any document
3. Click the **sparkle (✨) icon** in the toolbar
4. Click **"Enable Sanity AI Assist"** button
5. This creates an API token automatically

This only needs to be done once by someone with admin/developer permissions. After that, everyone can use AI Assist!

## Quick Start: Using AI Assist

### For New Images

When you upload a new image, AI Assist will **automatically generate alt text** for you. You can:
- ✅ Accept the AI-generated text if it's accurate
- ✏️ Edit it to add more context or fix any issues
- 🔄 Regenerate it if you don't like the first version

### For Existing Images

1. Click on the image field
2. Look for the **sparkle icon (✨)** next to the "Alternative Text" field
3. Click the sparkle and select **"Generate caption"**
4. AI will analyze the image and create a description
5. **Review and edit** the generated text (see guidelines below)
6. Click **Save** or **Publish**

## Auditing Alt Text

To find images that need better alt text, run the audit script:

```bash
cd crbc-new-site
node scripts/audit-alt-text.js
```

This will identify images with generic, missing, or low-quality alt text across all content types.

## Alt Text Best Practices

### The Golden Rules

1. **Be Specific and Descriptive**
   - Describe what you see, not what you think it means
   - Include relevant details that convey the image's purpose
   - Focus on content that matters to understanding the page

2. **Keep It Concise**
   - Aim for 10-125 characters
   - Screen readers may cut off longer descriptions
   - If you need more detail, use a caption or surrounding text

3. **Avoid Redundancy**
   - Don't start with "Image of..." or "Picture of..."
   - Screen readers already announce it's an image
   - Get straight to the description

4. **Consider Context**
   - Think about why the image is on the page
   - What information does it convey?
   - What would someone miss if they couldn't see it?

5. **Skip Decorative Images**
   - If an image is purely decorative, use empty alt text: `alt=""`
   - This tells screen readers to skip it
   - Examples: decorative borders, spacers, background patterns

### What to Avoid

❌ **Generic descriptions**: "Person", "Image", "Photo", "Church"  
❌ **Redundant phrases**: "Image of...", "Picture of...", "Photo of..."  
❌ **Too short**: Single words or very brief descriptions  
❌ **Too long**: Full sentences or paragraphs  
❌ **Subjective opinions**: "Beautiful sunset" → "Sunset over mountains"  
❌ **Technical jargon**: Unless relevant to the content  
❌ **File names**: "IMG_1234.jpg" or "photo-final-v2.png"

## Content-Specific Guidelines

### Staff Photos

**Purpose**: Identify the person and their role

✅ **Good Examples**:
- "Professional portrait of Karen Holcomb"
- "Headshot of Pastor John Grasty"
- "Reggie Coker, church custodian"

❌ **Bad Examples**:
- "Person" (too generic)
- "Image of Reggie Coker, a custodian, standing in a hallway with cleaning supplies in the background" (too long and detailed)
- "Staff member" (not specific)
- "A man in a blue shirt" (missing identity)

**Template**: `"Professional portrait of [Name]"` or `"[Name], [Role]"`

### Announcement Images

**Purpose**: Convey the event or message visually

✅ **Good Examples**:
- "Candlelit Christmas Eve service in decorated sanctuary"
- "Children hunting Easter eggs on church lawn"
- "Volunteers packing food boxes for community outreach"
- "Youth group bonfire at summer camp"

❌ **Bad Examples**:
- "Church event" (too generic)
- "Announcement image" (not descriptive)
- "People at church" (lacks context)

**Template**: `"[Activity] [location/context]"` - Focus on the action and setting

### Ministry Images

**Purpose**: Show ministry activities and community

✅ **Good Examples**:
- "Youth group students studying Bible together"
- "Volunteers preparing meals in church kitchen"
- "Children's choir performing during Sunday service"
- "Men's group hiking trail in local park"

❌ **Bad Examples**:
- "Ministry activity" (too vague)
- "Group of people" (lacks context)
- "Youth ministry" (not descriptive)

**Template**: `"[Group] [activity] [location]"` - Who, what, where

### Hero/Banner Images

**Purpose**: Set the tone and context for the page

✅ **Good Examples**:
- "Congregation worshiping with raised hands in sanctuary"
- "Open Bible on wooden table with morning light"
- "Church building exterior with steeple and cross"
- "Diverse group of people holding hands in prayer circle"

❌ **Bad Examples**:
- "Open Bible with cross in background" (too generic)
- "Church" (not descriptive)
- "Hero image" (not helpful)

**Template**: `"[Main subject] [relevant details]"` - Focus on the primary visual element

### Bento Cards/Feature Images

**Purpose**: Support the card's message or call-to-action

✅ **Good Examples**:
- "Congregation gathered for Sunday morning worship service"
- "Church sanctuary with rows of pews and stained glass windows"
- "Aerial view of church building and parking lot"
- "Welcome desk with greeters and information materials"

❌ **Bad Examples**:
- Empty alt text when image is meaningful
- "Card image" (not descriptive)
- Repeating the card title exactly

**Template**: Describe what the image shows that supports the card's purpose

### Article/Blog Images

**Purpose**: Illustrate the article's topic

✅ **Good Examples**:
- "Pastor teaching from pulpit during Sunday sermon"
- "Small group discussing Bible study questions"
- "Mission team serving meals at homeless shelter"

❌ **Bad Examples**:
- Repeating the article title
- "Blog post image"
- Generic descriptions

**Template**: `"[Scene that illustrates the article topic]"`

## Decision Tree: Writing Alt Text

Use this flowchart to decide what alt text to write:

```
Is the image decorative only (no information)?
├─ YES → Use empty alt text: alt=""
└─ NO → Continue...

Does the image contain text?
├─ YES → Include that text in the alt text
└─ NO → Continue...

Is it a person/people?
├─ YES → Include names if known, or describe the group and activity
└─ NO → Continue...

Is it a place/building?
├─ YES → Name the location and relevant details
└─ NO → Continue...

Is it an action/event?
├─ YES → Describe what's happening and where
└─ NO → Describe the main subject and relevant context
```

## Common Scenarios

### Scenario 1: Staff Photo with Generic Alt Text

**Current**: "Image of Reggie Coker, a custodian, standing in a hallway with cleaning supplies in the background."

**Problem**: Too long (95 characters), includes unnecessary details

**Better**: "Professional portrait of Reggie Coker"

**Why**: Concise, identifies the person, appropriate for staff directory

### Scenario 2: Missing Alt Text on Bento Card

**Current**: (missing)

**Card Title**: "Join us for worship"

**Better**: "Congregation worshiping together in sanctuary"

**Why**: Describes what the image shows, supports the card's message

### Scenario 3: Generic Hero Image

**Current**: "Open Bible with cross in background"

**Problem**: Generic, could apply to many images

**Better**: "Leather-bound Bible open to Psalms with wooden cross"

**Why**: More specific, paints a clearer picture

## Quality Checklist

Before saving alt text, ask yourself:

- [ ] Is it between 10-125 characters?
- [ ] Does it describe what's actually in the image?
- [ ] Would someone understand the image's purpose from this description?
- [ ] Have I avoided starting with "Image of..." or "Picture of..."?
- [ ] Is it specific enough to distinguish this image from others?
- [ ] Have I included names when people are identifiable?
- [ ] Does it match the tone and context of the page?

## Why This Matters

### Accessibility (Primary Reason)
- **Screen readers** read alt text aloud to visually impaired users
- **Cognitive disabilities**: Alt text helps users who have trouble processing visual information
- **Legal compliance**: Required by WCAG 2.1 Level AA standards

### SEO Benefits
- **Search engines** use alt text to understand and index images
- **Image search**: Good alt text helps images appear in relevant searches
- **Context**: Helps search engines understand page content

### User Experience
- **Slow connections**: Alt text displays while images load
- **Broken images**: Alt text shows when images fail to load
- **Context**: Provides additional information about the image

### Statistics
- **15% of US adults** have some form of vision impairment
- **26% of adults** have a disability that affects their daily life
- **100% of users** benefit from good alt text when images don't load

## Training Resources

### For Content Editors

1. **Read this guide** thoroughly before adding images
2. **Use AI Assist** as a starting point, not the final answer
3. **Review examples** in this guide for your content type
4. **Run the audit script** periodically to check your work
5. **Ask for feedback** from the web team if unsure

### For Reviewers

When reviewing content, check that alt text:
- Exists for all meaningful images
- Follows the guidelines in this document
- Is appropriate for the content type
- Is neither too short nor too long
- Accurately describes the image

## Need Help?

If you have questions about alt text or the AI Assist feature:

1. **Check this guide first** - Most questions are answered here
2. **Run the audit script** - See examples of good vs. bad alt text
3. **Contact the web team** - For complex cases or technical issues

## Additional Resources

- [WebAIM Alt Text Guide](https://webaim.org/techniques/alttext/)
- [W3C Alt Text Decision Tree](https://www.w3.org/WAI/tutorials/images/decision-tree/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/#text-alternatives)

---

**Remember**: AI-generated alt text is a helpful starting point, but you are the expert on your content. Always review and refine AI suggestions to ensure they accurately describe your images and serve your audience.
