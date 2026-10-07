// The read-only types, registered in schemaTypes/index.ts. structure/documentConfig.ts gives
// them no actions and no templates.
import liveStatus from './liveStatus'
import mediaOpsBinding from './mediaOpsBinding'
import mediaRelease from './mediaRelease'

export const readOnlyTypes = [mediaRelease, liveStatus, mediaOpsBinding]

export const readOnlyTypeNames = new Set(readOnlyTypes.map(({name}) => name))
