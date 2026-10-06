// Serialized size limits (contract section 10.2). Sizes are compact UTF-8 JSON, before compression.

export const ITEM_MAX_BYTES = 200_000;
export const LIST_MAX_BYTES = 256 * 1024; // 262,144

export const serializedBytes = (value: unknown): number => Buffer.byteLength(JSON.stringify(value), 'utf8');

export const itemFits = (item: unknown): boolean => serializedBytes(item) <= ITEM_MAX_BYTES;

// Builds the largest page, up to limit items, whose whole response body stays within the list cap.
// render turns the chosen items and the cursor for the next page into the response body.
// Returns the body and how many items it holds. A page always holds at least one item, because a
// single item is already bounded by ITEM_MAX_BYTES, which is below LIST_MAX_BYTES.
export function fitPage<T, B>(
  candidates: readonly T[],
  limit: number,
  render: (items: T[], nextAfter: T | null) => B,
): { body: B; count: number } {
  const max = Math.min(limit, candidates.length);
  for (let count = max; count >= 1; count--) {
    const items = candidates.slice(0, count);
    const more = candidates.length > count;
    const body = render(items, more ? items[count - 1] : null);
    if (serializedBytes(body) <= LIST_MAX_BYTES) return { body, count };
  }
  return { body: render([], null), count: 0 };
}
