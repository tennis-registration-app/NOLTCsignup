import { readFileSync, writeFileSync } from 'fs';
import { readdirSync, statSync } from 'fs';
import path from 'path';

function walk(dir, exts, results = []) {
  for (const f of readdirSync(dir)) {
    const full = path.join(dir, f);
    const st = statSync(full);
    if (st.isDirectory() && f !== 'node_modules' && f !== 'lib' && f !== 'dist') {
      walk(full, exts, results);
    } else if (exts.some(e => f.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

const files = walk('/Users/claudewilliams/Desktop/NOLTCsignup/src', ['.js', '.jsx', '.ts', '.tsx']);
let count = 0;

for (const f of files) {
  try {
    let c = readFileSync(f, 'utf8');
    const u = c.replace(/from (['"])(([.]+[\/])+lib[\/][^'"]+)\.js\1/g, 'from $1$2$1');
    if (u !== c) {
      writeFileSync(f, u);
      count++;
    }
  } catch (e) { /* skip */ }
}

console.log('Updated', count, 'files');