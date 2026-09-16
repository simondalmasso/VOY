import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../public/styles.css',import.meta.url),'utf8');
const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const build=await readFile(new URL('../scripts/build.ps1',import.meta.url),'utf8');

test('final UI removes prototype and developer-facing copy',()=>{
  for(const forbidden of ['Origen manual (no se persiste)','>Resolver<','Borrar ubicación elegida','Qué podés verificar','Sin inventar lo que falta','V VOY']){
    assert.equal(html.includes(forbidden),false,forbidden);
  }
});

test('map is not a giant empty initial placeholder',()=>{
  assert.match(html,/id="map-shell"[^>]*hidden/);
  assert.equal(html.includes('El mapa aparece cuando hace falta.'),false);
});

test('decorative mobility mode tabs are absent',()=>{
  assert.equal(html.includes('class="modes"'),false);
  assert.equal(html.includes('data-mode="Apps"'),false);
});

test('destination remains the primary app action',()=>{
  assert.match(html,/class="destination-hero"/);
  assert.match(html,/id="destination"/);
  assert.match(html,/id="destination-suggestions"/);
});

test('desktop and mobile layouts are explicitly designed',()=>{
  assert.match(css,/@media\s*\(min-width:\s*960px\)/);
  assert.match(css,/@media\s*\(max-width:\s*640px\)/);
});

test('final result options do not depend on decorative mode switching',()=>{
  assert.equal(app.includes("querySelectorAll('[data-mode]')"),false);
  assert.match(app,/function renderOptions\(/);
});


test('brand ships an original scalable mark and wordmark lockup',async()=>{

  assert.match(html,/class="brand-lockup"/);

  assert.match(html,/class="brand-mark"/);

  assert.match(html,/class="brand-wordmark"/);

  const mark=await readFile(new URL('../public/icons/app-icon.svg',import.meta.url),'utf8');

  assert.match(mark,/viewBox="0 0 512 512"/);

  assert.match(mark,/aria-label="VOY"|<title>VOY<\/title>/);

});



test('contextual assistant is visible, deterministic and state-driven',()=>{

  assert.match(html,/id="voy-assistant"/);

  assert.match(html,/id="assistant-action"/);

  assert.match(app,/function updateAssistant\(/);

  assert.equal(app.includes('openai'),false);

  assert.equal(app.includes('chat/completions'),false);

});



test('motion is restrained and reduced-motion aware',()=>{

  assert.match(css,/prefers-reduced-motion:reduce/);

  assert.match(css,/--motion-fast:/);

  assert.match(css,/--motion-slow:/);

});



test('PWA branding is complete and build cache identity is immutable',async()=>{

  const manifest=JSON.parse(await readFile(new URL('../public/manifest.json',import.meta.url),'utf8'));

  const sw=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');

  const build=await readFile(new URL('../scripts/build.ps1',import.meta.url),'utf8');

  assert.equal(manifest.name,'VOY — Movilidad en Argentina');

  assert.equal(manifest.theme_color,'#ffd42a');

  for(const icon of manifest.icons){

    const rel=icon.src.replace(/^\//,'');

    await readFile(new URL(`../public/${rel}`,import.meta.url));

  }

  assert.match(sw,/const BUILD_ID='__BUILD_ID__'/);

  assert.match(build,/textClientFiles/);
  assert.match(build,/sw\.js/);

  assert.match(build,/__BUILD_ID__/);

  const index=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const contracts=await readFile(new URL('../public/contracts.js',import.meta.url),'utf8');
  assert.match(index,/styles\.css\?v=__BUILD_ID__/);
  assert.match(index,/app\.js\?v=__BUILD_ID__/);
  assert.match(app,/runtime-config\.js\?v=__BUILD_ID__/);
  assert.match(app,/contracts\.js\?v=__BUILD_ID__/);
  assert.match(contracts,/runtime-config\.js\?v=__BUILD_ID__/);
  assert.match(sw,/fetch\(req\).*caches\.match\(req\)/s);
  assert.doesNotMatch(sw,/caches\.match\(req\)\.then\(hit=>hit\|\|fetch\(req\)/);

});




test('build inlines pinned GeoRef runtime authority into the deployable worker',async()=>{

  const build=await readFile(new URL('../scripts/build.ps1',import.meta.url),'utf8');

  const authority=await readFile(new URL('../src/georef-authority.generated.js',import.meta.url),'utf8');

  assert.match(authority,/OFFICIAL_GEOREF_RUNTIME_AUTHORITY_META/);

  assert.match(authority,/pinned official GeoRef resources/i);

  assert.match(build,/georef-authority\.generated\.js/);

  assert.match(build,/OFFICIAL_GEOREF_RUNTIME_AUTHORITY_META/);

});



test('destination status live region exists for runtime status and assistant state',()=>{
  assert.match(html,/id="destination-status"/);
  assert.match(html,/id="destination-status"[^>]*aria-live="polite"/);
});


test('final HTML has no replacement artifacts and exposes VOY favicon identity',()=>{
  assert.equal(html.includes('$1'),false);
  assert.match(html,/rel="icon"[^>]*href="\/icons\/app-icon\.svg"/);
});


test('mobile and footer interactive targets preserve at least 44px hit areas',()=>{
  assert.equal(/\.theme-button\{width:42px;height:42px\}/.test(css),false);
  assert.match(css,/\.footer a\{[^}]*min-height:44px[^}]*display:inline-flex/);
});


test('assistant and footer touch targets remain at least 44px in both dimensions',()=>{
  assert.match(css,/\.assistant-toggle\{[^}]*height:44px/);
  assert.match(css,/\.assistant-heading button\{[^}]*width:44px;[^}]*height:44px;[^}]*min-width:44px;[^}]*min-height:44px/);
  assert.match(css,/\.footer a\{[^}]*min-width:44px[^}]*min-height:44px/);
});


test('destination keyboard focus remains visibly outlined after component styles',()=>{
  assert.match(css,/\.destination-control input:focus-visible\{[^}]*outline:3px solid/);
});


test('release build copies only the intentional public client allowlist',()=>{
  assert.equal(/Copy-Item public\\\*/.test(build),false);
  assert.match(build,/\$publicFiles=@\(/);
  assert.match(build,/public\\icons/);
});
