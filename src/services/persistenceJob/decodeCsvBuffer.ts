/**
 * Decode a CSV buffer to a string, handling common encodings.
 *
 * Priority:
 *   1. UTF-8 BOM present (EF BB BF) → strip BOM, decode as UTF-8
 *   2. Valid strict UTF-8             → decode as UTF-8
 *   3. Windows-1252 fallback          → covers Latin-1 + ñ, tildes, accented
 *                                       vowels and other chars common in
 *                                       Excel exports from Latin-region machines
 */
export function decodeCsvBuffer(buffer: Buffer): string {
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString('utf-8');
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}
