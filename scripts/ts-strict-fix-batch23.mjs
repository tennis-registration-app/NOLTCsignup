import { readFileSync as R, writeFileSync as W } from 'fs';
function fix(p, ...args) {
  let c = R(p, 'utf8');
  let changed = 0;
  for (let i = 0; i < args.length; i += 2) {
    const from = args[i], to = args[i + 1];
    if (c.includes(from)) { c = c.split(from).join(to); changed++; }
    else process.stdout.write('MISS: ' + p + ' | ' + from.slice(0, 60) + '
');
  }
  if (changed) { W(p, c); process.stdout.write('Fixed: ' + p + '
'); }
}
export {}; // placeholder - run sub-scripts