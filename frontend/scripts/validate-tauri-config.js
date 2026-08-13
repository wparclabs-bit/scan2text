/**
 * S9.6 Validation: tauri.conf.json bundle.resources config
 *
 * Verifies that:
 * 1. tauri.conf.json is valid JSON
 * 2. bundle.resources entry exists
 * 3. The target backend folder exists on disk
 *
 * Run: node frontend/scripts/validate-tauri-config.js
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TAURI_CONF = resolve(__dirname, '../src-tauri/tauri.conf.json');
const BACKEND_FOLDER_RELATIVE = '../../dist/scan2text-backend';
const BACKEND_FOLDER_ABSOLUTE = resolve(__dirname, BACKEND_FOLDER_RELATIVE);

let failures = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
  } else {
    console.error(`  FAIL: ${message}`);
    failures++;
  }
}

console.log('S9.6 — Tauri bundle.resources validation\n');

// 1. Parse JSON
console.log('1. Parsing tauri.conf.json...');
let config;
try {
  const raw = readFileSync(TAURI_CONF, 'utf-8');
  config = JSON.parse(raw);
  console.log('  PASS: tauri.conf.json is valid JSON');
} catch (e) {
  console.error(`  FAIL: tauri.conf.json parse error: ${e.message}`);
  failures++;
  process.exit(1);
}

// 2. Check bundle.resources exists
console.log('\n2. Checking bundle.resources entry...');
assert(
  config.bundle && config.bundle.resources !== undefined,
  'bundle.resources must be present in tauri.conf.json'
);

// 3. Check bundle.resources is non-empty
assert(
  Array.isArray(config.bundle.resources) && config.bundle.resources.length > 0,
  'bundle.resources must be a non-empty array'
);

// 4. Check target path exists
console.log('\n3. Checking target path exists...');
assert(
  existsSync(BACKEND_FOLDER_ABSOLUTE),
  `Backend folder must exist at ${BACKEND_FOLDER_ABSOLUTE}`
);

// 5. Verify the array contains the expected path
const resources = config.bundle?.resources;
const expectedPath = BACKEND_FOLDER_RELATIVE;
const hasExpectedPath = resources && Array.isArray(resources) && resources.includes(expectedPath);
assert(
  hasExpectedPath,
  `bundle.resources must include "${expectedPath}"`
);

// Summary
console.log('\n' + '='.repeat(50));
if (failures === 0) {
  console.log('ALL CHECKS PASSED');
  process.exit(0);
} else {
  console.log(`FAILED: ${failures} check(s) failed`);
  process.exit(1);
}
