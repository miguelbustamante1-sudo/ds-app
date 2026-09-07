/**
 * generate-uds-theme.ts
 * Reads .design-system/uds-tokens.json and generates a Tailwind v4-compatible
 * CSS file with all UDS color tokens registered under @theme.
 *
 * Usage (from ds-app/):  npx tsx scripts/generate-uds-theme.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Paths  (ESM-safe __dirname equivalent)
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

const MONOREPO_ROOT = resolve(__dir, '../..');             // TICADSApp/
const TOKENS_FILE   = join(MONOREPO_ROOT, '.design-system', 'uds-tokens.json');
const OUTPUT_FILE   = resolve(__dir, '../client/src/styles/uds-theme.css');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type TokenNode = {
  $type?: string;
  $value?: string | number;
  $description?: string;
} & Record<string, unknown>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Slugify a key: lowercase, strip parens, non-alphanum → hyphen */
function slugify(key: string): string {
  return key
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, '')    // remove "(don't use)", "(agnostic)", etc.
    .replace(/[^a-z0-9-]/g, '-')   // non-alphanum → hyphen
    .replace(/-{2,}/g, '-')         // collapse consecutive hyphens
    .replace(/^-|-$/g, '');         // trim edges
}

/** True if node is a leaf design-token (has a $value) */
function isLeaf(node: unknown): node is TokenNode & { $value: string | number } {
  return (
    typeof node === 'object' &&
    node !== null &&
    '$value' in node &&
    (node as TokenNode).$value !== undefined
  );
}

// ---------------------------------------------------------------------------
// Recursive walker
// ---------------------------------------------------------------------------
const colorVars: string[]    = [];
const gradientVars: string[] = [];

function walk(node: Record<string, unknown>, segments: string[]): void {
  for (const [key, child] of Object.entries(node)) {
    // Skip Figma meta keys ($extensions, $type, $value, $description)
    // and intentionally-hidden groups (start with _)
    if (key.startsWith('$') || key.startsWith('_')) continue;

    const seg = slugify(key);

    if (isLeaf(child)) {
      const value = String(child.$value);

      if (value.startsWith('linear-gradient') || value.startsWith('radial-gradient')) {
        // Gradients → plain CSS var so they can be used as background values
        gradientVars.push(`  --gradient-${[...segments, seg].join('-')}: ${value};`);
      } else if (child.$type === 'color') {
        // Solid colours → Tailwind @theme color token
        colorVars.push(`  --color-${[...segments, seg].join('-')}: ${value};`);
      }
    } else if (typeof child === 'object' && child !== null) {
      walk(child as Record<string, unknown>, [...segments, seg]);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main(): void {
  if (!existsSync(TOKENS_FILE)) {
    console.error(`[uds-theme] ❌  Token file not found:\n  ${TOKENS_FILE}`);
    process.exit(1);
  }

  const json = JSON.parse(readFileSync(TOKENS_FILE, 'utf-8')) as Record<string, unknown>;
  const uds  = json['uds'] as Record<string, unknown> | undefined;

  if (!uds) {
    console.error('[uds-theme] ❌  No "uds" root key found in the token file.');
    process.exit(1);
  }

  // Find the agnostic group: "telus (agnostic)"
  const agnosticKey = Object.keys(uds).find((k) => k.toLowerCase().includes('agnostic'));
  if (!agnosticKey) {
    console.error('[uds-theme] ❌  Could not find the "(agnostic)" token group.');
    process.exit(1);
  }

  const agnostic = uds[agnosticKey] as Record<string, unknown>;
  const colorRoot = agnostic['color'] as Record<string, unknown> | undefined;

  if (!colorRoot) {
    console.error('[uds-theme] ❌  No "color" key in the agnostic group.');
    process.exit(1);
  }

  // Walk: produces --color-uds-telus-purple-500, --color-uds-system-grey-100, …
  walk(colorRoot, ['uds']);

  // ---------------------------------------------------------------------------
  // Compose CSS
  // ---------------------------------------------------------------------------
  const timestamp = new Date().toISOString();

  const css = [
    '/**',
    ' * uds-theme.css  –  AUTO-GENERATED. DO NOT EDIT MANUALLY.',
    ` * Generated : ${timestamp}`,
    ' * Source    : .design-system/uds-tokens.json',
    ' * Regenerate: npm run theme:generate   (from ds-app/)',
    ' */',
    '',
    '/* ---------------------------------------------------------------',
    '   UDS Color Tokens',
    '   Tailwind utilities auto-generated from the token names:',
    '     bg-uds-telus-purple-500',
    '     text-uds-system-grey-300',
    '     border-uds-system-red-500',
    '   etc.',
    '--------------------------------------------------------------- */',
    '@theme inline {',
    ...colorVars,
    '}',
    '',
    ...(gradientVars.length
      ? [
          '/* ---------------------------------------------------------------',
          '   UDS Gradient Tokens (use as plain CSS vars):',
          '     background: var(--gradient-uds-telus-gradient-brand)',
          '     background: var(--gradient-uds-telus-gradient-purple)',
          '--------------------------------------------------------------- */',
          ':root {',
          ...gradientVars,
          '}',
          '',
        ]
      : []),
  ].join('\n');

  // Ensure the output directory exists
  const outDir = dirname(OUTPUT_FILE);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  writeFileSync(OUTPUT_FILE, css, 'utf-8');

  console.log(`[uds-theme] ✅  ${colorVars.length} color vars  |  ${gradientVars.length} gradient vars written.`);
  console.log(`[uds-theme] 📄  ${OUTPUT_FILE}`);
}

main();
