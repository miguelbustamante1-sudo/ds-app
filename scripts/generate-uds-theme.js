/**
 * generate-uds-theme.js  (CommonJS – runs with plain `node`)
 * Reads .design-system/uds-tokens.json and generates a Tailwind v4-compatible
 * CSS file with all UDS color tokens registered under @theme.
 *
 * Usage (from repo root or ds-app/):
 *   node ds-app/scripts/generate-uds-theme.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const MONOREPO_ROOT = path.resolve(__dirname, '../..');      // TICADSApp/
const TOKENS_FILE   = path.join(MONOREPO_ROOT, '.design-system', 'uds-tokens.json');
const OUTPUT_FILE   = path.resolve(__dirname, '../client/src/styles/uds-theme.css');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Slugify: lowercase, strip parens, non-alphanum → hyphen */
function slugify(key) {
  return key
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, '')    // "(don't use)", "(agnostic)"…
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/** True when the node is a leaf design-token */
function isLeaf(node) {
  return (
    node !== null &&
    typeof node === 'object' &&
    '$value' in node &&
    node.$value !== undefined
  );
}

// ---------------------------------------------------------------------------
// Recursive walker
// ---------------------------------------------------------------------------
const colorVars    = [];
const gradientVars = [];

function walk(node, segments) {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$') || key.startsWith('_')) continue;

    const seg = slugify(key);

    if (isLeaf(child)) {
      const value = String(child.$value);

      if (value.startsWith('linear-gradient') || value.startsWith('radial-gradient')) {
        gradientVars.push(`  --gradient-${[...segments, seg].join('-')}: ${value};`);
      } else if (child.$type === 'color') {
        colorVars.push(`  --color-${[...segments, seg].join('-')}: ${value};`);
      }
    } else if (child !== null && typeof child === 'object') {
      walk(child, [...segments, seg]);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  if (!fs.existsSync(TOKENS_FILE)) {
    console.error(`[uds-theme] ❌  Token file not found:\n  ${TOKENS_FILE}`);
    process.exit(1);
  }

  const json = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
  const uds  = json['uds'];

  if (!uds) {
    console.error('[uds-theme] ❌  No "uds" root key found in the token file.');
    process.exit(1);
  }

  // "telus (agnostic)"
  const agnosticKey = Object.keys(uds).find((k) => k.toLowerCase().includes('agnostic'));
  if (!agnosticKey) {
    console.error('[uds-theme] ❌  Could not find the "(agnostic)" token group.');
    process.exit(1);
  }

  const colorRoot = uds[agnosticKey]['color'];
  if (!colorRoot) {
    console.error('[uds-theme] ❌  No "color" key in the agnostic group.');
    process.exit(1);
  }

  // Walk — produces --color-uds-telus-purple-500, --color-uds-system-grey-100 …
  walk(colorRoot, ['uds']);

  // ---------------------------------------------------------------------------
  // Build CSS
  // ---------------------------------------------------------------------------
  const timestamp = new Date().toISOString();

  const blocks = [
    '/**',
    ' * uds-theme.css  –  AUTO-GENERATED. DO NOT EDIT MANUALLY.',
    ` * Generated : ${timestamp}`,
    ' * Source    : .design-system/uds-tokens.json',
    ' * Regenerate: node ds-app/scripts/generate-uds-theme.js',
    ' */',
    '',
    '/* ---------------------------------------------------------------',
    '   UDS Color Tokens — available as Tailwind utilities:',
    '     bg-uds-telus-purple-500',
    '     text-uds-system-grey-300',
    '     border-uds-system-red-500',
    '--------------------------------------------------------------- */',
    '@theme inline {',
    ...colorVars,
    '}',
    '',
  ];

  if (gradientVars.length) {
    blocks.push(
      '/* ---------------------------------------------------------------',
      '   UDS Gradient Tokens — use as plain CSS vars:',
      '     background: var(--gradient-uds-telus-gradient-brand)',
      '     background: var(--gradient-uds-telus-gradient-purple)',
      '--------------------------------------------------------------- */',
      ':root {',
      ...gradientVars,
      '}',
      '',
    );
  }

  const css = blocks.join('\n');

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, css, 'utf-8');

  console.log(`[uds-theme] ✅  ${colorVars.length} color vars  |  ${gradientVars.length} gradient vars written.`);
  console.log(`[uds-theme] 📄  ${OUTPUT_FILE}`);
}

main();
