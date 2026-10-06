// UTF-8 byte counts, as the contract measures sizes. The contract's size module counts with
// Node's Buffer, which the Studio's browser bundle lacks, so Studio counts with TextEncoder.
const encoder = new TextEncoder()

export const utf8Bytes = (text: string): number => encoder.encode(text).length
