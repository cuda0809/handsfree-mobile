import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

for (const page of ['index.html', 'real-v08/index.html']) {
  test(`${page}: inline scripts compile before browser initialization`, () => {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
    assert.ok(scripts.length > 0);
    for (const [, source] of scripts) new Script(source, { filename: page });
  });
}
