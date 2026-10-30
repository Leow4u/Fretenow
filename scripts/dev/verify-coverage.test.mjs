import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const workspace = resolve('.');
const verifier = resolve('scripts/dev/verify-coverage.mjs');
const inventoryPath = 'docs/research/linklane-parity.json';
const optionalPath = 'output/implementation/qa/android-wire-api.json';
const read = (path) => readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
const canonical = (value) => value.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

function fixture({ crlf = false, includeLocal = false } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'fretenow-coverage-'));
  const coverage = JSON.parse(read('docs/implementation/coverage.json'));
  const source = canonical(read(inventoryPath));
  coverage.inventory.hashBasis = 'utf8-no-bom-lf';
  coverage.inventory.sha256 = createHash('sha256').update(source, 'utf8').digest('hex');
  coverage.localArtifacts = [{ path: optionalPath, required: false, description: 'Ignored local controller replay evidence; not distributed in clones.' }];
  const required = new Set();
  const collect = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if ((key === 'sources' || key === 'evidence') && Array.isArray(child)) {
        for (const path of child) if (typeof path === 'string' && path !== optionalPath) required.add(path);
      } else collect(child);
    }
  };
  collect(coverage);
  for (const path of required) {
    const target = join(directory, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(workspace, path), target);
  }
  const write = (path, text) => {
    const target = join(directory, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, 'utf8');
  };
  write(inventoryPath, crlf ? source.replace(/\n/g, '\r\n') : source);
  write('docs/implementation/coverage.json', JSON.stringify(coverage));
  if (includeLocal) write(optionalPath, JSON.stringify({ fixture: true }));
  return directory;
}
function run(directory) {
  return spawnSync(process.execPath, [verifier], { cwd: directory, encoding: 'utf8' });
}
for (const crlf of [false, true]) {
  test(`${crlf ? 'CRLF' : 'LF'} checkout passes without optional local evidence and reports absence`, () => {
    const result = run(fixture({ crlf }));
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Optional local artifact absent: output\/implementation\/qa\/android-wire-api\.json/);
    assert.match(result.stdout, /"modules":12,"features":46,"moduleRoutes":22,"apiContracts":44/);
  });
}
test('available optional local evidence is checked without absence notice', () => {
  const result = run(fixture({ includeLocal: true }));
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /Optional local artifact absent/);
});
for (const [role, path] of [['source', 'services/api/src/app.ts'], ['report', 'docs/implementation/task-3-report.md']]) {
  test(`missing required ${role} still fails`, () => {
    const directory = fixture();
    unlinkSync(join(directory, path)); // Only removes this test's copied fixture file.
    const result = run(directory);
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes(`Missing required ${role === 'source' ? 'source' : 'evidence'}: ${path}`), result.stderr);
  });
}
