// Join-code generation for live sessions. Uses an unambiguous alphabet (no
// 0/O/1/I/L) so codes are easy to read aloud and type on a phone. Uniqueness is
// enforced by the caller against the database. Relative imports only — this may
// later be shared with the tsx socket server.

import { randomInt } from "crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateJoinCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/** Normalize user-entered codes for lookup (uppercase, no surrounding space). */
export function normalizeJoinCode(raw: string): string {
  return raw.trim().toUpperCase();
}
