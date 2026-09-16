import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeResolvedCandidate} from '../public/contracts.js';

test('map-resolvable destination survives territorial verification outage without inventing locality',()=>{
  const value=normalizeResolvedCandidate({
    label:'Destino seleccionado',territory_verified:false,province:null,locality:null,
    coordinates:{lat:-31.6333,lon:-60.7},coverage:'T0_TERRITORY_ONLY',integration_slug:null
  });
  assert.ok(value);
  assert.equal(value.territory_verified,false);
  assert.equal(value.province,null);
  assert.equal(value.locality,null);
});


test('top-level unverified territory is authoritative when nested flag is missing',()=>{
  const value=normalizeResolvedCandidate({
    label:'Destino seleccionado',province:null,locality:null,
    coordinates:{lat:-32.8876419,lon:-68.8406505},coverage:'T0_TERRITORY_ONLY',integration_slug:null
  },false);
  assert.ok(value);
  assert.equal(value.territory_verified,false);
  assert.equal(value.province,null);
  assert.equal(value.locality,null);
});

test('missing nested territory verification never defaults to verified',()=>{
  const value=normalizeResolvedCandidate({
    label:'Destino seleccionado',province:{id:'50',name:'Mendoza'},locality:{name:'Mendoza'},
    coordinates:{lat:-32.8876419,lon:-68.8406505},coverage:'T0_TERRITORY_ONLY',integration_slug:null
  });
  assert.ok(value);
  assert.equal(value.territory_verified,false);
});
