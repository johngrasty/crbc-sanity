// Speaker initials for /facets (contract section 10.2, erratum E45). Clients show them when a
// speaker has no photo. The rule is Studio's, limited to A to Z: the first letter of the name's
// first and last words, or of its only word, in upper case. Each letter folds to at most one
// letter from A to Z, so the result holds at most two.

// Latin letters that compatibility decomposition doesn't split into a base letter and a mark.
const FOLDS: Record<string, string> = {
  Ø: 'O', ø: 'O', Œ: 'O', œ: 'O', Æ: 'A', æ: 'A', Ð: 'D', ð: 'D', Đ: 'D', đ: 'D',
  Þ: 'T', þ: 'T', Ł: 'L', ł: 'L', ß: 'S', ẞ: 'S',
};

// One letter from A to Z, or undefined when the letter has none. A ligature such as ﬃ keeps its
// first letter, F.
function fold(letter: string): string | undefined {
  const first = (FOLDS[letter] ?? letter.normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase())[0];
  return first !== undefined && first >= 'A' && first <= 'Z' ? first : undefined;
}

export function speakerInitials(name: string): string | undefined {
  const letters = name
    .split(/\s+/)
    .map((word) => word.match(/\p{L}/u)?.[0])
    .filter((letter): letter is string => letter !== undefined);
  const picked = letters.length > 1 ? [letters[0], letters[letters.length - 1]] : letters;
  const initials = picked.map(fold).filter((letter) => letter !== undefined).join('');
  return initials || undefined;
}
