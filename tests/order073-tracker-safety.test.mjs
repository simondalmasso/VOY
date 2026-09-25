import test from 'node:test';
import assert from 'node:assert/strict';
import {presentTransportEntity} from '../public/3d/temporal.js';

const base=Object.freeze({
  id:'vehicle-1',
  mode:'bus',
  temporal_state:'realtime',
  observed_at:'2026-09-25T04:00:00.000Z',
  lat:-31.6500,
  lon:-60.7100,
  bearing:90,
  line:'1',
  route_id:'route-1',
  source_id:'official-test'
});

test('ORDER073 tracker rejects timestamp regression before deriving movement',()=>{
  const previous=base;
  const next=Object.freeze({...base,observed_at:'2026-09-25T03:59:59.000Z',lat:-31.6499,lon:-60.7099});
  const out=presentTransportEntity(previous,next,Date.parse('2026-09-25T04:00:01.000Z'),{
    freshnessMs:20000,
    maxSpeedMps:45,
    maxSnapMeters:35,
    verifiedGeometry:[[-60.7100,-31.6500],[-60.7099,-31.6499]]
  });
  assert.equal(out.render,false);
  assert.equal(out.reason,'timestamp_regression');
});

test('ORDER073 tracker rejects physically impossible realtime jumps',()=>{
  const previous=base;
  const next=Object.freeze({...base,observed_at:'2026-09-25T04:00:10.000Z',lat:-31.5500,lon:-60.6100});
  const out=presentTransportEntity(previous,next,Date.parse('2026-09-25T04:00:10.000Z'),{
    freshnessMs:20000,
    maxSpeedMps:45,
    maxSnapMeters:35,
    verifiedGeometry:[[-60.7100,-31.6500],[-60.6100,-31.5500]]
  });
  assert.equal(out.render,false);
  assert.equal(out.reason,'impossible_jump');
  assert.ok(out.observed_speed_mps>45);
});

test('ORDER073 tracker enforces bounded route snapping',()=>{
  const previous=base;
  const next=Object.freeze({...base,observed_at:'2026-09-25T04:00:10.000Z',lat:-31.64995,lon:-60.70995});
  const farGeometry=[[-60.7000,-31.6400],[-60.6990,-31.6390]];
  const out=presentTransportEntity(previous,next,Date.parse('2026-09-25T04:00:05.000Z'),{
    freshnessMs:20000,
    maxSpeedMps:45,
    maxSnapMeters:35,
    verifiedGeometry:farGeometry
  });
  assert.equal(out.render,false);
  assert.equal(out.reason,'snap_out_of_bounds');
  assert.ok(out.snap_distance_m>35);
});

test('ORDER073 derived render state is separate from immutable source observations',()=>{
  const previous=base;
  const next=Object.freeze({...base,observed_at:'2026-09-25T04:00:10.000Z',lat:-31.6499,lon:-60.7099});
  const before=JSON.stringify({previous,next});
  const out=presentTransportEntity(previous,next,Date.parse('2026-09-25T04:00:05.000Z'),{
    freshnessMs:20000,
    maxSpeedMps:45,
    maxSnapMeters:35,
    verifiedGeometry:[[-60.7100,-31.6500],[-60.7099,-31.6499]]
  });
  assert.equal(out.render,true);
  assert.equal(out.temporal_state,'realtime');
  assert.equal(out.visual_state,'realtime');
  assert.ok(Number.isFinite(out.render_lat));
  assert.ok(Number.isFinite(out.render_lon));
  assert.ok(Number.isFinite(out.freshness_age_ms));
  assert.ok(Number.isFinite(out.snap_distance_m));
  assert.equal(JSON.stringify({previous,next}),before);
  assert.equal(out.source_observation,next);
  assert.equal(out.previous_source_observation,previous);
});

test('ORDER073 predicted state is visibly distinct and never animated',()=>{
  const predicted=Object.freeze({...base,temporal_state:'predicted',observed_at:'2026-09-25T04:00:10.000Z'});
  const out=presentTransportEntity(null,predicted,Date.parse('2026-09-25T04:00:10.000Z'));
  assert.equal(out.render,true);
  assert.equal(out.animated,false);
  assert.equal(out.visual_state,'predicted');
  assert.equal(out.temporal_state,'predicted');
});

test('ORDER073 reduced motion never invents interpolation',()=>{
  const previous=base;
  const next=Object.freeze({...base,observed_at:'2026-09-25T04:00:10.000Z',lat:-31.6499,lon:-60.7099});
  const out=presentTransportEntity(previous,next,Date.parse('2026-09-25T04:00:05.000Z'),{
    freshnessMs:20000,
    maxSpeedMps:45,
    maxSnapMeters:35,
    reducedMotion:true,
    verifiedGeometry:[[-60.7100,-31.6500],[-60.7099,-31.6499]]
  });
  assert.equal(out.render,true);
  assert.equal(out.animated,false);
  assert.equal(out.interpolation_fraction,1);
  assert.equal(out.render_lat,next.lat);
  assert.equal(out.render_lon,next.lon);
});
