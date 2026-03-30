import fs from 'fs';
var nc = fs.readFileSync('src/registration/search/useMemberSearch.ts', 'utf8');
var lines = nc.split('\n');
if (lines[0].indexOf('import React') === -1) { lines.unshift(\"import React from 'react';\"); }
var lt = String.fromCharCode(60);
var gt = String.fromCharCode(62);
var typed = '(e: React.ChangeEvent' + lt + 'HTMLInputElement' + gt + ') => {';
for (var i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '(e) => {') { lines[i] = lines[i].replace('(e) => {',typed); }
}
fs.writeFileSync('src/registration/search/useMemberSearch.ts', lines.join('\n'));
console.log('done');