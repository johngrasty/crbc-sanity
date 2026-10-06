// Identifier formats (contract section 2). IDs are a prefix plus a ULID in Crockford base32.

export const ID_PREFIXES = {
  content: 'mi_',
  series: 'se_',
  speaker: 'sp_',
  topic: 'tp_',
  event: 'ev_',
  session: 'ss_',
  asset: 'as_',
  candidate: 'ca_',
  op: 'op_',
} as const;

export type IdKind = keyof typeof ID_PREFIXES;

const ULID = '[0-9A-HJKMNP-TV-Z]{26}';
const patterns = Object.fromEntries(
  Object.entries(ID_PREFIXES).map(([kind, prefix]) => [kind, new RegExp(`^${prefix}${ULID}$`)]),
) as Record<IdKind, RegExp>;

export function isId(kind: IdKind, value: string): boolean {
  return patterns[kind].test(value);
}

// Resource IDs are configuration slugs, for example lr_main (section 2).
export function isResourceId(value: string): boolean {
  return /^lr_[a-z0-9_]{1,40}$/.test(value);
}

// Mirror document IDs carry the environment (section 3). The dots make them private in Sanity.
export type Environment = 'dev' | 'staging' | 'production';

export const mediaReleaseDocId = (env: Environment, contentId: string): string => `mediaRelease.${env}.${contentId}`;
export const liveStatusDocId = (env: Environment, channel: string): string => `liveStatus.${env}.${channel}`;
