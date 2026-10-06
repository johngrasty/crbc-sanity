// The document settings sanity.config.ts passes to Sanity. They live here, not in the config,
// because the full config can't load in Node and the test harness builds from this module.
import type {DocumentActionsResolver, TemplateResolver} from 'sanity'
import {PreviewAction} from './documentActions'
import {previewableTypes} from './preview'
import {singletonActions, singletonTypes} from './singletons'

export const documentActions: DocumentActionsResolver = (prev, context) => {
  if (singletonTypes.has(context.schemaType)) {
    return prev.filter(({action}) => action && singletonActions.has(action))
  }
  return previewableTypes.has(context.schemaType) ? [...prev, PreviewAction] : prev
}

export const templates: TemplateResolver = (prev) =>
  prev.filter(({schemaType}) => !singletonTypes.has(schemaType))
