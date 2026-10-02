'use strict';
// Offline fixture snapshots. This module does not execute workspace code or grade models.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const validText = value => typeof value === 'string' && value.trim().length > 0;
const safeRelative = value => validText(value) && !path.isAbsolute(value) &&
  value.split('/').every(part => part && !part.startsWith('.') && !part.includes('\\'));

function readFixture(sourceRoot, id) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id || '')) throw new Error('Unsafe fixture ID');
  const base = path.join(sourceRoot, 'evals', 'fixtures', id);
  let stat;
  try { stat = fs.lstatSync(base); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Invalid fixture directory: ${id}`);
  const metadataPath = path.join(base, 'review.json');
  const metaStat = fs.lstatSync(metadataPath);
  if (!metaStat.isFile() || metaStat.isSymbolicLink()) throw new Error(`Invalid fixture review: ${id}`);
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  if (metadata.schema_version !== 1 || metadata.case_id !== id || !['browser','data','sql'].includes(metadata.runtime) ||
      !Array.isArray(metadata.entrypoints) || !metadata.entrypoints.length || !metadata.entrypoints.every(safeRelative) ||
      new Set(metadata.entrypoints).size !== metadata.entrypoints.length ||
      !Array.isArray(metadata.checklist) || !metadata.checklist.length || !metadata.checklist.every(validText))
    throw new Error(`Invalid fixture metadata: ${id}`);
  const workspace = path.join(base, 'workspace');
  const workspaceStat = fs.lstatSync(workspace);
  if (!workspaceStat.isDirectory() || workspaceStat.isSymbolicLink()) throw new Error(`Invalid fixture workspace: ${id}`);
  const snapshots = [];
  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, {withFileTypes:true}).sort((a,b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const relative = prefix + entry.name;
      if (!safeRelative(relative) || entry.isSymbolicLink()) throw new Error(`Unsafe fixture entry: ${id}/${relative}`);
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file, relative + '/');
      else if (entry.isFile()) {
        const bytes = fs.readFileSync(file);
        snapshots.push({path:relative, bytes:bytes.length, sha256:digest(bytes), content:bytes});
      } else throw new Error(`Unsupported fixture entry: ${id}/${relative}`);
    }
  }
  walk(workspace);
  if (!snapshots.length || metadata.entrypoints.some(name => !snapshots.some(file => file.path === name && file.bytes > 0)))
    throw new Error(`Empty or missing fixture entrypoint: ${id}`);
  const files = snapshots.map(({content, ...file}) => file);
  return {id, metadata, snapshots, files, tree_sha256:digest(JSON.stringify(files))};
}

function copyFixture(fixture, target) {
  // target is a new child of prepare()'s exclusively owned, source-external directory.
  fs.mkdirSync(target, {mode:0o700});
  for (const file of fixture.snapshots) {
    const dest = path.join(target, file.path);
    fs.mkdirSync(path.dirname(dest), {recursive:true, mode:0o700});
    // Copy the bytes we hashed, not a second read of a potentially changed source.
    fs.writeFileSync(dest, file.content, {flag:'wx', mode:0o600});
  }
}
module.exports = {readFixture, copyFixture};
