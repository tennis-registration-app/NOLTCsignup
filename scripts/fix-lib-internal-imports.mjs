import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

function walk(dir, exts, results = []) {
  for (const f of readdirSync(dir)) {
    const full = path.join(dir, f);
    const st = statSync(full);
    if (st.isDirectory() && f !== 'node_modules') {
      walk(full, exts, results);
    } else if (exts.some(e => f.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

const files = walk('/Users/claudewilliams/Desktop/NOLTCsignup/src/lib', ['.ts', '.js']);
let count = 0;

for (const f of files) {
  try {
    let c = readFileSync(f, 'utf8');
    // Remove .js from any relative import (./ and ../ prefix)
    const u = c.replace(/from (['"])((\.\.?\/)+[^'"]+)\.js\1/g, 'from $1$2$1');
    if (u !== c) {
      writeFileSync(f, u);
      count++;
      console.log('Updated:', f.replace('/Users/claudewilliams/Desktop/NOLTCsignup/', ''));
    }
  } catch (e) { /* skip */ }
}

console.log('Done. Updated', count, 'files');