/** FNV-1a 32-bit hash: deterministic, tiny, good enough to pick avatar variants from an id. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Pick an item from a list using a hash and a salt so different traits vary independently. */
export function pickBy<T>(items: readonly T[], hash: number, salt: number): T {
  // murmur3 finaliser for a good avalanche on short ids
  let h = (hash ^ Math.imul(salt, 0x9e3779b1)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return items[(h >>> 0) % items.length];
}
