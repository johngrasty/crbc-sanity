# Alt Text Improvement Summary

## What Was Done

We've improved alt text quality across the entire website by:

1. ✅ **Created comprehensive guidelines** - Updated ALT_TEXT_GUIDE.md with detailed best practices
2. ✅ **Added validation rules** - All image fields now require 10-125 character alt text
3. ✅ **Updated schema descriptions** - Added helpful hints and examples in Sanity Studio
4. ✅ **Created audit script** - Tool to identify images with generic or missing alt text
5. ✅ **Identified issues** - Found 7 images that need better alt text

## Current Status

### Images Needing Attention (7 total)

#### Staff (1 image)
- **Reggie Coker** - Current alt text is too long and detailed
  - Current: "Image of Reggie Coker, a custodian, standing in a hallway with cleaning supplies in the background."
  - Suggested: "Professional portrait of Reggie Coker"

#### Home Page Bento Cards (4 images)
All missing alt text:
- **Join us for worship** - Needs: Description of worship scene
- **When we meet** - Needs: Description of sanctuary or service times visual
- **What to expect** - Needs: Description of welcoming scene
- **Find us** - Needs: Description of location/map visual

#### Beliefs Page (2 images)
- **Hero Image** - Generic alt text
  - Current: "Open Bible with cross in background"
  - Needs: More specific description of the actual image
- **CTA Image** - Missing alt text

## Action Items for Content Editors

### Immediate Actions (Required)

1. **Open Sanity Studio** and navigate to each document listed above

2. **For each image**:
   - Click the image field
   - Click the **sparkle icon (✨)** next to "Alternative Text"
   - Select "Generate caption"
   - **Review the AI-generated text** (don't just accept it!)
   - Edit to match our guidelines (see below)
   - Save/publish

3. **Run the audit script** after making changes:
   ```bash
   cd crbc-new-site
   node scripts/audit-alt-text.js
   ```

### Quick Reference: Alt Text Guidelines

#### Length
- **Minimum**: 10 characters
- **Maximum**: 125 characters
- **Sweet spot**: 40-80 characters

#### Format
- ✅ "Professional portrait of John Smith"
- ✅ "Youth group students studying Bible together"
- ❌ "Image of John Smith" (redundant)
- ❌ "Person" (too generic)
- ❌ "Image of Reggie Coker, a custodian, standing in a hallway with cleaning supplies in the background." (too long)

#### Content Type Templates

**Staff Photos**: `"Professional portrait of [Name]"`

**Ministry Images**: `"[Group] [activity] [location]"`
- Example: "Youth group students studying Bible together"

**Announcement Images**: `"[Activity] [location/context]"`
- Example: "Candlelit Christmas Eve service in decorated sanctuary"

**Hero/Banner Images**: `"[Main subject] [relevant details]"`
- Example: "Congregation worshiping with raised hands in sanctuary"

**Bento Cards**: Describe what supports the card's message
- Example: "Congregation gathered for Sunday morning worship service"

### Training Resources

1. **Read ALT_TEXT_GUIDE.md** - Comprehensive guide with examples
2. **Use the decision tree** - Helps you decide what to write
3. **Check the quality checklist** - Before saving alt text
4. **Review examples** - See good vs. bad examples for each content type

## Technical Changes Made

### Schema Updates

All image fields now have:
- **Required validation** with 10-125 character limits
- **Helpful descriptions** with examples
- **Reference to ALT_TEXT_GUIDE.md** for detailed guidance
- **AI Assist enabled** for automatic generation

Updated schemas:
- `announcement.ts` - Featured images
- `article.ts` - Main images
- `ministry.ts` - Hero images
- `staff.ts` - Profile images
- `objects/bentoCard.ts` - Background images
- `pages/beliefs.ts` - Hero and CTA images

### New Tools

**Audit Script** (`crbc-new-site/scripts/audit-alt-text.js`):
- Scans all content types for images
- Identifies generic or missing alt text
- Provides suggestions for improvement
- Can be run anytime to check quality

**Generic Pattern Detection**:
The script flags these as generic:
- Single words: "image", "photo", "person", "church"
- Redundant phrases: "image of", "picture of", "photo of"
- Too short: Less than 10 characters
- Default values: "Open Bible with cross in background", "Call to action"

## Why This Matters

### Accessibility
- **15% of US adults** have vision impairments
- Screen readers rely on alt text to describe images
- Required by WCAG 2.1 Level AA standards

### SEO
- Search engines use alt text to understand images
- Improves image search rankings
- Provides context for page content

### User Experience
- Alt text displays when images fail to load
- Helps users on slow connections
- Provides additional context

## Next Steps

### For Content Editors

1. **This week**: Fix the 7 identified images
2. **Ongoing**: Use AI Assist for all new images
3. **Monthly**: Run audit script to check quality
4. **Always**: Review and edit AI-generated text

### For Reviewers

When reviewing content, verify:
- [ ] All images have alt text
- [ ] Alt text is 10-125 characters
- [ ] Alt text is descriptive, not generic
- [ ] Alt text follows content-specific guidelines
- [ ] No redundant phrases ("Image of...")

### For Administrators

1. **Enable AI Assist** (one-time setup)
2. **Share this document** with all content editors
3. **Schedule training** on alt text best practices
4. **Monitor compliance** using the audit script

## Questions?

- **Read ALT_TEXT_GUIDE.md** for detailed guidance
- **Run the audit script** to see examples
- **Contact the web team** for complex cases

---

**Last Updated**: October 18, 2025  
**Status**: Ready for implementation  
**Priority**: High (accessibility compliance)
