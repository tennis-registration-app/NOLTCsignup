import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadFixture(name) {
  const path = join(__dirname, '..', 'fixtures', `${name}.json`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}
