// Text limits from the media contract (section 10.2). The contract's JSON Schema counts a
// string's length in Unicode code points. Sanity's max() counts UTF-16 units, so it counts an
// emoji as two characters and rejects text the contract allows. These rules count code points.
import type {StringRule} from 'sanity'
import contract from '../../media-contract/schemas/media-v1.schema.json' with {type: 'json'}

// Titles, labels and names, from the contract's Label definition.
export const LABEL_MAX_LENGTH: number = contract.$defs.Label.maxLength

// An error when a string has more than max characters, counted as Unicode code points.
export const characterLimit = (rule: StringRule, max: number) =>
  rule.custom((value) => {
    const length = value ? [...value].length : 0
    return length <= max ? true : `Use ${max} characters or fewer. This has ${length}.`
  })

// The limit for every title, label and name: validation: (rule) => labelLimit(rule)
export const labelLimit = (rule: StringRule) => characterLimit(rule, LABEL_MAX_LENGTH)
