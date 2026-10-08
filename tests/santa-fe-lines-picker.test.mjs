import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { listSantaFeLines, geometriesForSantaFeLine, labelSantaFeLine } from '../public/transit/line-picker.js';
const segmentA=[[-60.7,-31.6],[-60.69,-31.61]];
const segmentB=[[-60.71,-31.62],[-60.70,-31.63]];
const routes=[
  {short_name:'10',segments:[segmentA]},
  {short_name:'2',segments:[segmentB]},
  {short_name:'10',segments:[segmentB]},
  {short_name:'1',segments:[segmentA]},
  {short_name:'',segments:[segmentB]}
];
test('line selector lists unique published numbers in numeric order',()=>{
  assert.deepEqual(listSantaFeLines(routes),['1','2','10']);
});
test('selected line shows only its geometry, all restores the network',()=>{
  assert.deepEqual(geometriesForSantaFeLine(routes,'10'),[segmentA,segmentB]);
  assert.deepEqual(geometriesForSantaFeLine(routes,''),[segmentA,segmentB,segmentB,segmentA,segmentB]);
  assert.deepEqual(geometriesForSantaFeLine(routes,'99'),[]);
});
test('invalid segments do not appear as published geometry',()=>{
  assert.deepEqual(geometriesForSantaFeLine([{short_name:'3',segments:[[[0,0]],'bad',segmentA]}],'3'),[segmentA]);
  assert.deepEqual(listSantaFeLines(null),[]);
});
test('municipal direction and prefix variants collapse into a legible line',()=>{
  const mixed=[
    {short_name:'Línea20_Ida',segments:[segmentA]},
    {short_name:'Línea20_Vuelta',segments:[segmentB]},
    {short_name:'21_Ida',segments:[segmentA]},
    {short_name:'21_Vuelta',segments:[segmentB]},
    {short_name:'RondaB_Ida',segments:[segmentA]},
    {short_name:'RondaB_Vuelta',segments:[segmentB]}
  ];
  assert.deepEqual(listSantaFeLines(mixed),['20','21','Ronda B']);
  assert.deepEqual(geometriesForSantaFeLine(mixed,'20'),[segmentA,segmentB]);
  assert.deepEqual(geometriesForSantaFeLine(mixed,'Ronda B'),[segmentA,segmentB]);
  assert.equal(labelSantaFeLine('20'),'Línea 20');
  assert.equal(labelSantaFeLine('Ronda B'),'Ronda B');
});
test('route overlays remain yellow while raster basemap alone is muted',async()=>{
  const css=await readFile(new URL('../public/styles.css',import.meta.url),'utf8');
  assert.doesNotMatch(css,/\.map-tiles,#map-canvas canvas\{filter:/);
  assert.match(css,/\.map-tile\{filter:grayscale/);
  assert.match(css,/\.transit-network-overlay\{color:rgba\(255,212,42,\.80\)/);
});
