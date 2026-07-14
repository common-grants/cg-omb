import { createHash } from "node:crypto";

/**
 * Namespace UUID for the OMB plugin's deterministic ids. Fixed constant — do not
 * change, or previously-derived opportunity ids will no longer match.
 */
export const OMB_NAMESPACE = "6f9b1a3e-8c2d-4e5f-a1b0-3c4d5e6f7a8b";

/** Parse a canonical UUID string into its 16 bytes. */
function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
}

/** Format 16 bytes as a canonical UUID string. */
function bytesToUuid(bytes: Buffer): string {
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/**
 * Deterministic RFC 4122 version-5 (SHA-1, name-based) UUID.
 *
 * Same `namespace` + `name` always yields the same UUID, so an opportunity's id
 * is stable across runs when derived from its Funding Opportunity Number.
 */
export function uuidv5(name: string, namespace: string = OMB_NAMESPACE): string {
  const hash = createHash("sha1").update(uuidToBytes(namespace)).update(name, "utf8").digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  return bytesToUuid(bytes);
}
