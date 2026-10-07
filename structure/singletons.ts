// Each type uses its type name as the fixed document ID in deskStructure.ts.
export const singletonTypes = new Set([
  'homePage',
  'aboutPage',
  'connectPage',
  'beliefsPage',
  'givingPage',
  'visitPage',
  'servicesPage',
  'watchPage',
  'calendarPage',
  'lifeGroupsPage',
  'communityGroupsPage',
  'settings',
  'siteAlert',
  'designTokens',
  'mainMenu',
  'footerMenu',
  'footerSettings',
  'mediaSettings',
])

export const singletonActions = new Set(['publish', 'discardChanges', 'restore'])

// Singletons that keep their template, so their fixed document opens with its field defaults.
// No create menu offers them. Every other singleton has no template.
export const singletonsWithTemplates = new Set(['mediaSettings'])
