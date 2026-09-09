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
])

export const singletonActions = new Set(['publish', 'discardChanges', 'restore'])
