/**
 * Seeded test records (a test client's quote, its acceptance and its test deposit) were created before the
 * launch and cannot be deleted: accepted quotes are permanent records. They are hidden from the admin and
 * client screens by their id prefix, so no real client or revenue figure ever includes them. Real records
 * use random UUIDs, which never start with this prefix.
 */
export const TEST_ID_PREFIX = "0000a000-";

/** Test records made before the prefix was used. Their ids are random, so they are listed here instead. */
export const KNOWN_TEST_IDS: ReadonlySet<string> = new Set([
  // The seeded test quote's acceptance (and its £900 test deposit).
  "d38b5fa9-0f83-45d1-88d5-82f2f951c371",
]);

export function isTestRecord(id: string | null | undefined): boolean {
  return typeof id === "string" && (id.startsWith(TEST_ID_PREFIX) || KNOWN_TEST_IDS.has(id));
}
