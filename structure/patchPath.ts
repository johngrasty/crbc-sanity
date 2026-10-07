// The paths in a form follow-up step's patch, such as title, editorHold.note,
// passages[_key=="a"].display or passages[0]. A step writes one with patchPath. The form's runner
// and the harness both read it with parsePatchPath, so a key survives the trip whatever it holds.
// Sanity's own stringToPath splits a key at a dot or a ], so it isn't used here.
import type {KeyedSegment, Path} from 'sanity'

const FIELD = /^[A-Za-z_][A-Za-z0-9_]*/

function refuse(text: string, reason: string): never {
  throw new Error(`The patch path ${JSON.stringify(text)} ${reason}`)
}

// Writes a path. A key goes in double quotes, with any double quote or backslash in it escaped,
// so a dot, a bracket or a quote in a key reads back unchanged.
export function patchPath(path: Path): string {
  return path
    .map((segment, index) => {
      if (typeof segment === 'string' && FIELD.exec(segment)?.[0] === segment) {
        return index === 0 ? segment : `.${segment}`
      }
      if (typeof segment === 'number' && Number.isInteger(segment) && segment >= 0) {
        return `[${segment}]`
      }
      if (segment && typeof segment === 'object' && !Array.isArray(segment)) {
        const key = String((segment as KeyedSegment)._key)
        return `[_key=="${key.replace(/[\\"]/g, '\\$&')}"]`
      }
      return refuse(JSON.stringify(path), "has a segment a patch path can't hold")
    })
    .join('')
}

// Reads a key in quotes, starting at the opening quote. A backslash escapes a quote or a
// backslash, and any other backslash stays as it is. A quote like the opening one ends the key
// only when ] follows it, so a raw quote inside a key, as Sanity's pathToString writes it, stays.
function readKey(text: string, start: number): [key: string, end: number] {
  const quote = text[start]
  let key = ''
  for (let index = start + 1; index < text.length; index++) {
    const character = text[index]
    const next = text[index + 1]
    if (character === '\\' && (next === '\\' || next === '"' || next === "'")) {
      key += next
      index++
    } else if (character === quote && next === ']') {
      return [key, index + 2]
    } else {
      key += character
    }
  }
  return refuse(text, 'has a key with no closing quote and ]')
}

// Reads a path that patchPath wrote, or one in Sanity's own string form. It starts with a field
// name, then reads .field, [_key=="..."] and [index] segments, with indexes from 0. It refuses
// anything else, such as a negative index, which counts from the end, or a range, so a patch
// never lands somewhere other than where it names.
export function parsePatchPath(text: string): Path {
  const first = FIELD.exec(text)
  if (!first) refuse(text, 'must start with a field name')
  const path: Path = [first[0]]
  let index = first[0].length
  while (index < text.length) {
    const rest = text.slice(index)
    const field = rest.startsWith('.') ? FIELD.exec(rest.slice(1)) : null
    if (field) {
      path.push(field[0])
      index += 1 + field[0].length
      continue
    }
    if (/^\[_key==["']/.test(rest)) {
      const [key, end] = readKey(text, index + 7)
      path.push({_key: key})
      index = end
      continue
    }
    const position = /^\[(-?\d+)\]/.exec(rest)
    if (position) {
      if (position[1].startsWith('-')) {
        refuse(text, 'has a negative index. Name the item by its _key.')
      }
      path.push(Number(position[1]))
      index += position[0].length
      continue
    }
    refuse(text, `can't be read from ${JSON.stringify(rest)}`)
  }
  return path
}
