import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = (path) => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const sourcePath = 'docs/research/linklane-parity.json';
const source = read(sourcePath);
const coverage = read('docs/implementation/coverage.json');
assert.equal(coverage.inventory.hashBasis, 'utf8-no-bom-lf');
const canonicalSource = readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
assert.equal(coverage.inventory.sha256, createHash('sha256').update(canonicalSource, 'utf8').digest('hex'));
const optionalArtifacts = new Set();
for (const artifact of coverage.localArtifacts ?? []) {
  assert.equal(artifact.required, false);
  assert.match(artifact.path, /^output\//, 'Only local output artifacts may be optional');
  assert.ok(!artifact.path.split('/').includes('..'), 'Optional paths cannot escape output/');
  assert.ok(artifact.description, 'Optional artifacts require a description');
  optionalArtifacts.add(artifact.path);
}
const missingOptional = new Set();
function checkReferences(entry) {
  for (const path of entry.sources ?? []) {
    assert.ok(existsSync(path), `Missing required source: ${path}`);
  }
  for (const path of entry.evidence ?? []) {
    if (optionalArtifacts.has(path) && !existsSync(path)) missingOptional.add(path);
    else assert.ok(existsSync(path), `Missing required evidence: ${path}`);
  }
}
assert.equal(coverage.modules.length, source.modules.length);
const platforms = ['api', 'web', 'ios', 'android'];
const states = new Set(Object.keys(coverage.statusDefinitions));
let features = 0;
let routes = 0;
for (const [index, original] of source.modules.entries()) {
  const module = coverage.modules[index];
  assert.equal(module.id, original.id);
  assert.equal(module.name, original.name);
  assert.deepEqual(module.sourceFeatures, original.features);
  assert.deepEqual(module.sourceRoutes, original.routes);
  assert.deepEqual(module.features.map((item) => item.sourceStatement), original.features);
  assert.deepEqual(module.routes.map((item) => item.sourceRoute), original.routes);
  for (const item of [module, ...module.features]) {
    for (const platform of platforms) {
      const entry = item.platforms[platform];
      assert.ok(entry && states.has(entry.status), `${module.id}/${platform}: missing status`);
      checkReferences(entry);
      if (platform === 'ios' || platform === 'android') assert.notEqual(entry.runtimeVerified, true);
    }
  }
  for (const route of module.routes) for (const platform of platforms) {
    assert.ok(states.has(route[platform].status));
    checkReferences(route[platform]);
  }
  features += module.features.length;
  routes += module.routes.length;
}
assert.deepEqual(coverage.apiContracts.map((item) => item.sourceContract), source.apiContracts);
assert.equal(new Set(coverage.apiContracts.map((item) => item.key)).size, source.apiContracts.length);
for (const contract of coverage.apiContracts) {
  assert.equal(contract.key, `${contract.sourceContract.method} ${contract.sourceContract.path}`);
  for (const platform of platforms) {
    const entry = contract.platforms[platform];
    assert.ok(states.has(entry.status));
    checkReferences(entry);
    if (platform === 'ios' || platform === 'android') assert.equal(entry.runtimeVerified, false);
  }
}
const counts = { modules: source.modules.length, features, moduleRoutes: routes, apiContracts: source.apiContracts.length };
assert.deepEqual(counts, coverage.inventory.counts);
assert.deepEqual(counts, { modules: 12, features: 46, moduleRoutes: 22, apiContracts: 44 });
for (const path of missingOptional) console.log(`Optional local artifact absent: ${path} (not distributed in clones; required reports remain checked).`);
console.log(`Coverage inventory preserved: ${JSON.stringify(counts)}; canonical LF hash, per-platform statuses and required source/report paths checked.`);
console.log('This checks documentation integrity only; it does not execute application or native runtime tests.');
