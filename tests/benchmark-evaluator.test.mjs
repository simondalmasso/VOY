import test from 'node:test';
import assert from 'node:assert/strict';
import {entityRelevant, territoryMatchesExpected, territoryMatchesAuthority} from '../scripts/benchmark-evaluator.mjs';

const candidate=(primary, secondary='Santa Fe · Santa Fe', locality='Santa Fe', province='Santa Fe', province_id='82')=>({
  display_primary:primary, display_secondary:secondary,
  locality:{name:locality}, province:{name:province,id:province_id}
});

test('address relevance rejects unrelated same-city entity',()=>{
  assert.equal(entityRelevant('San Martín 1000','address',candidate('Martín Zapata')),false);
});

test('address relevance accepts matching street entity even when provider omits house number',()=>{
  assert.equal(entityRelevant('San Martín 1000','address',candidate('Calle San Martín')),true);
});

test('typo relevance tolerates one-edit human input',()=>{
  assert.equal(entityRelevant('rivdavia','typo',candidate('Avenida Bernardino Rivadavia','Rosario · Santa Fe','Rosario')),true);
});

test('poi relevance requires entity terms, not territory alone',()=>{
  assert.equal(entityRelevant('Terminal de Córdoba','poi',candidate('Terminal de Ómnibus de Córdoba','Córdoba · Córdoba','Córdoba','Córdoba','14')),true);
  assert.equal(entityRelevant('Terminal de Córdoba','poi',candidate('Hospital Córdoba','Córdoba · Córdoba','Córdoba','Córdoba','14')),false);
});

test('territorial expectation is evaluated separately',()=>{
  const expected={locality:'Rosario',province:'Santa Fe',province_id:'82'};
  assert.equal(territoryMatchesExpected(candidate('Rivadavia','Rosario · Santa Fe','Rosario'),expected),true);
  assert.equal(territoryMatchesExpected(candidate('Rivadavia','Santa Fe · Santa Fe','Santa Fe'),expected),false);
});

test('authority comparison detects false locality invention',()=>{
  const output=candidate('Rivadavia','Falsa Ciudad · Santa Fe','Falsa Ciudad');
  const authority={locality:{name:'Santa Fe'},province:{name:'Santa Fe',id:'82'}};
  assert.equal(territoryMatchesAuthority(output,authority),false);
});
