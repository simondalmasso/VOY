import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('offline fallback is valid UTF-8 user copy with no mojibake or developer shell wording', async()=>{
  const html=await readFile(new URL('../public/offline.html',import.meta.url),'utf8');
  assert.match(html,/VOY — Sin conexión/);
  assert.match(html,/Sin conexión/);
  assert.doesNotMatch(html,/Ã|â|Â|shell/i);
  assert.match(html,/necesitamos conexión para verificar datos territoriales y de movilidad actuales/i);
});
