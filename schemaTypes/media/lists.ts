// Rules for lists: how many items a list holds, and no item twice. Sanity's own max() and
// unique() give generic messages, and unique() compares whole items, so a draft-only reference
// with _weak set and a plain reference to the same document don't count as a repeat.
import type {ArrayRule, Path, ValidationError} from 'sanity'

// An error when a list has more than max items. noun names them, such as speakers.
export const itemLimit = <T>(rule: ArrayRule<T[]>, max: number, noun: string) =>
  rule.custom((value) => {
    const count = value?.length ?? 0
    return count <= max ? true : `Use ${max} ${noun} or fewer. This has ${count}.`
  })

const hasKey = (item: unknown): item is {_key: string} =>
  typeof item === 'object' && item !== null && typeof (item as {_key?: unknown})._key === 'string'

// An error on each item that repeats an earlier one. sameAs gives what two items share when they
// count as the same, such as a reference's _ref. Items it returns undefined for are skipped.
export const noRepeats = <T>(rule: ArrayRule<T[]>, sameAs: (item: T) => unknown, message: string) =>
  rule.custom((value) => {
    const seen = new Set<unknown>()
    const repeats: ValidationError[] = []
    value?.forEach((item, index) => {
      const key = sameAs(item)
      if (key === undefined) return
      const path: Path = [hasKey(item) ? {_key: item._key} : index]
      if (seen.has(key)) repeats.push({message, path})
      seen.add(key)
    })
    return repeats.length ? repeats : true
  })

// The document a reference points at, so noRepeats counts two references to it as one, whatever
// else they carry, such as _weak.
export const referencedId = (item: unknown) =>
  typeof item === 'object' && item !== null ? (item as {_ref?: unknown})._ref : undefined
