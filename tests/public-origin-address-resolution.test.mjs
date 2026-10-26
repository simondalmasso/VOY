import test from 'node:test';

import assert from 'node:assert/strict';

import {resolveAddress} from '../src/worker.template.js';



const jsonResp=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});

const address=(id,label,lat,lon,locality='Santa Fe',province='Santa Fe',provinceId='82',localityId='82063170')=>({

  id,nomenclatura:label,ubicacion:{lat,lon},

  provincia:{id:provinceId,nombre:province},

  localidad:{id:localityId,nombre:locality}

});

const pair=()=>[

  address('1','SAN MARTIN 2954, Santa Fe, La Capital, Santa Fe',-31.64166,-60.70510),

  address('2','ZORRILLA DE SAN MARTIN 2954, Santa Fe, La Capital, Santa Fe',-31.63237,-60.70722)

];



test('two-part street address parses locality and selects the exact verified street, not its namesake',async()=>{

  let seen;

  const result=await resolveAddress({query:'San Martín 2954, Santa Fe'},async url=>{

    const u=new URL(String(url));seen=u;

    return jsonResp({direcciones:pair()});

  });

  assert.equal(seen.searchParams.get('direccion'),'San Martín 2954');

  assert.equal(seen.searchParams.get('localidad'),'Santa Fe');

  assert.equal(seen.searchParams.has('provincia'),false);

  assert.equal(result.result_class,'resolved');

  assert.equal(result.candidates.length,1);

  assert.equal(result.candidates[0].label,'SAN MARTIN 2954, Santa Fe, La Capital, Santa Fe');

  assert.equal(result.candidates[0].territory_verified,true);

});



test('three-part address parses street, locality and province before querying GeoRef',async()=>{

  let seen;

  const result=await resolveAddress({query:'Bv. Gálvez 1150, Santa Fe, Santa Fe'},async url=>{

    const u=new URL(String(url));seen=u;

    return jsonResp({direcciones:[address('3','BV GALVEZ 1150, Santa Fe, La Capital, Santa Fe',-31.63884,-60.68749)]});

  });

  assert.equal(seen.searchParams.get('direccion'),'Bv. Gálvez 1150');

  assert.equal(seen.searchParams.get('localidad'),'Santa Fe');

  assert.equal(seen.searchParams.get('provincia'),'Santa Fe');

  assert.equal(result.result_class,'resolved');

  assert.equal(result.candidates[0].label,'BV GALVEZ 1150, Santa Fe, La Capital, Santa Fe');

});



test('exact street matching supports common avenue and boulevard abbreviations',async()=>{

  const result=await resolveAddress({query:'Av. 7 Jefes 5100, Santa Fe'},async()=>{

    return jsonResp({direcciones:[

      address('4','AVENIDA 7 JEFES 5100, Santa Fe, La Capital, Santa Fe',-31.64,-60.68),

      address('5','AVENIDA 7 JEFES SUR 5100, Santa Fe, La Capital, Santa Fe',-31.65,-60.69)

    ]});

  });

  assert.equal(result.result_class,'resolved');

  assert.equal(result.candidates[0].label,'AVENIDA 7 JEFES 5100, Santa Fe, La Capital, Santa Fe');

});



test('same-number substring road remains ambiguous when no exact address match exists',async()=>{

  const result=await resolveAddress({query:'San Martín 2954, Santa Fe'},async()=>{

    return jsonResp({direcciones:[

      address('6','ZORRILLA DE SAN MARTIN 2954, Santa Fe, La Capital, Santa Fe',-31.63,-60.70),

      address('7','SAN MARTIN SUR 2954, Santa Fe, La Capital, Santa Fe',-31.64,-60.71)

    ]});

  });

  assert.equal(result.result_class,'ambiguous');

  assert.equal(result.candidates.length,2);

});



test('bare street-number query without locality context remains ambiguous',async()=>{

  const result=await resolveAddress({query:'San Martín 2954'},async()=>{

    return jsonResp({direcciones:pair()});

  });

  assert.equal(result.result_class,'ambiguous');

  assert.equal(result.candidates.length,2);

});



test('explicit locality disambiguates the same exact street across territories',async()=>{

  const result=await resolveAddress({query:'San Martín 2954, Santa Fe'},async()=>{

    return jsonResp({direcciones:[

      address('8','SAN MARTIN 2954, Santa Fe, La Capital, Santa Fe',-31.64,-60.70),

      address('9','SAN MARTIN 2954, Rosario, Rosario, Santa Fe',-32.95,-60.64,'Rosario','Santa Fe','82','82084070')

    ]});

  });

  assert.equal(result.result_class,'resolved');

  assert.equal(result.candidates.length,1);
  assert.equal(result.candidates[0].locality.name,'Santa Fe');

});



test('valid GeoRef address records without coordinates return unverified, not upstream_schema_invalid',async()=>{
  const result=await resolveAddress({query:'Av. 7 Jefes 5100, Santa Fe'},async()=>{
    return jsonResp({direcciones:[{
      id:'10',nomenclatura:'AV 7 JEFES 5100, Santa Fe, La Capital, Santa Fe',
      ubicacion:{lat:null,lon:null},
      provincia:{id:'82',nombre:'Santa Fe'},
      localidad:{id:null,nombre:null},
      localidad_censal:{id:'82063170',nombre:'Santa Fe'}
    }]});
  });
  assert.equal(result.result_class,'unverified');
  assert.equal(result.error,'territory_coordinates_unavailable');
  assert.deepEqual(result.candidates,[]);
});

test('same-territory exact candidate with missing-coordinate duplicate fails closed',async()=>{
  const result=await resolveAddress({query:'San Martín 2954, Santa Fe'},async()=>{
    return jsonResp({direcciones:[
      address('11','SAN MARTIN 2954, Santa Fe, La Capital, Santa Fe',-31.64166,-60.70510),
      {id:'12',nomenclatura:'SAN MARTIN 2954, Santa Fe, La Capital, Santa Fe',
       ubicacion:{lat:null,lon:null},provincia:{id:'82',nombre:'Santa Fe'},
       localidad:{id:null,nombre:null},localidad_censal:{id:'82063170',nombre:'Santa Fe'}}
    ]});
  });
  assert.equal(result.result_class,'unverified');
  assert.equal(result.error,'territory_coordinates_unavailable');
  assert.deepEqual(result.candidates,[]);
});

test('unlocated exact street from another locality does not block the unique contextualized exact match',async()=>{
  const result=await resolveAddress({query:'San Martín 2954, Santa Fe'},async()=>{
    return jsonResp({direcciones:[
      address('13','SAN MARTIN 2954, Santa Fe, La Capital, Santa Fe',-31.64166,-60.70510),
      {id:'14',nomenclatura:'SAN MARTIN 2954, San Francisco de Santa Fe, General López, Santa Fe',
       ubicacion:{lat:null,lon:null},provincia:{id:'82',nombre:'Santa Fe'},
       localidad:{id:null,nombre:null},localidad_censal:{id:'82042240',nombre:'San Francisco de Santa Fe'}}
    ]});
  });
  assert.equal(result.result_class,'resolved');
  assert.equal(result.candidates.length,1);
  assert.equal(result.candidates[0].label,'SAN MARTIN 2954, Santa Fe, La Capital, Santa Fe');
});

test('malformed upstream address schema remains a 502-class error',async()=>{
  await assert.rejects(()=>resolveAddress({query:'San Martín 2954, Santa Fe'},async()=>jsonResp({direcciones:[{unexpected:true}]})),error=>error.code==='upstream_schema_invalid');
});

test('full GeoRef-style address label extracts locality before department and province',async()=>{
  let seen;
  const result=await resolveAddress({query:'Bv. Gálvez 1150, Santa Fe, La Capital, Santa Fe'},async url=>{
    seen=new URL(String(url));
    return jsonResp({direcciones:[address('15','BV GALVEZ 1150, Santa Fe, La Capital, Santa Fe',-31.63884,-60.68749)]});
  });
  assert.equal(seen.searchParams.get('direccion'),'Bv. Gálvez 1150');
  assert.equal(seen.searchParams.get('localidad'),'Santa Fe');
  assert.equal(seen.searchParams.get('provincia'),'Santa Fe');
  assert.equal(result.result_class,'resolved');
  assert.equal(result.candidates[0].locality.name,'Santa Fe');
});

test('country suffix and repeated locality-department suffix are parsed without changing the street number',async()=>{
  let seen;
  const result=await resolveAddress({query:'San Martín 2954, Rosario, Rosario, Santa Fe, Argentina'},async url=>{
    seen=new URL(String(url));
    return jsonResp({direcciones:[address('16','SAN MARTIN 2954, Rosario, Rosario, Santa Fe',-32.97193,-60.64306,'Rosario','Santa Fe','82','82084070')]});
  });
  assert.equal(seen.searchParams.get('direccion'),'San Martín 2954');
  assert.equal(seen.searchParams.get('localidad'),'Rosario');
  assert.equal(seen.searchParams.get('provincia'),'Santa Fe');
  assert.equal(result.result_class,'resolved');
  assert.equal(result.candidates[0].locality.name,'Rosario');
});

test('a single same-number substring candidate is not silently resolved as the requested street',async()=>{
  const result=await resolveAddress({query:'San Martín 2954, Santa Fe'},async()=>{
    return jsonResp({direcciones:[address('17','ZORRILLA DE SAN MARTIN 2954, Santa Fe, La Capital, Santa Fe',-31.63237,-60.70722)]});
  });
  assert.equal(result.result_class,'unverified');
  assert.equal(result.error,'territory_unverified');
  assert.deepEqual(result.candidates,[]);
});

test('explicit locality context rejects a conflicting comma suffix before querying GeoRef',async()=>{
  let fetched=false,errorSeen=null;
  try {
    await resolveAddress({query:'San Martín 2954, Rosario',locality:'Santa Fe',province:'Santa Fe'},async()=>{
      fetched=true;
      return jsonResp({direcciones:[address('18','SAN MARTIN 2954, Santa Fe, La Capital, Santa Fe',-31.64166,-60.70510)]});
    });
  } catch(error) {
    errorSeen=error;
  }
  assert.equal(errorSeen?.code,'invalid_query');
  assert.equal(errorSeen?.detail,'address_context_conflict');
  assert.equal(fetched,false);
});

test('explicit province context rejects a conflicting trailing province before querying GeoRef',async()=>{
  let fetched=false,errorSeen=null;
  try {
    await resolveAddress({query:'San Martín 2954, Rosario, Entre Ríos',locality:'Rosario',province:'Santa Fe'},async()=>{
      fetched=true;
      return jsonResp({direcciones:[address('19','SAN MARTIN 2954, Rosario, Rosario, Santa Fe',-32.97193,-60.64306,'Rosario','Santa Fe','82','82084070')]});
    });
  } catch(error) {
    errorSeen=error;
  }
  assert.equal(errorSeen?.code,'invalid_query');
  assert.equal(errorSeen?.detail,'address_context_conflict');
  assert.equal(fetched,false);
});
