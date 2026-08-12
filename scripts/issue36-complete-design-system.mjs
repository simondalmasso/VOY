import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/styles/global.css';
let css = readFileSync(path, 'utf8');
const original = css;
const applied = [];
const categoryCounts = new Map();

function replaceAll(category, from, to) {
  const count = css.split(from).length - 1;
  if (count > 0) {
    css = css.split(from).join(to);
    applied.push({ category, from, to, count });
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + count);
  }
}

for (const [category, from, to] of [
  ['weight','font-weight:500','font-weight:var(--voy-weight-regular)'],
  ['weight','font-weight:650','font-weight:var(--voy-weight-label)'],
  ['weight','font-weight:680','font-weight:var(--voy-weight-result)'],
  ['weight','font-weight:700','font-weight:var(--voy-weight-bold)'],
  ['weight','font-weight:720','font-weight:var(--voy-weight-display)'],
  ['weight','font-weight:750','font-weight:var(--voy-weight-strong)'],
  ['weight','font-weight:760','font-weight:var(--voy-weight-metric)'],
  ['weight','font-weight:800','font-weight:var(--voy-weight-heavy)'],
  ['weight','font-weight:900','font-weight:var(--voy-weight-black)'],
  ['size','font-size:10px','font-size:var(--voy-type-overline)'],
  ['size','font-size:11px','font-size:var(--voy-type-eyebrow)'],
  ['size','font-size:12px','font-size:var(--voy-type-caption)'],
  ['size','font-size:13px','font-size:var(--voy-type-label)'],
  ['size','font-size:14px','font-size:var(--voy-type-control)'],
  ['size','font-size:15px','font-size:var(--voy-type-body-sm)'],
  ['size','font-size:16px','font-size:var(--voy-type-body)'],
  ['size','font-size:17px','font-size:var(--voy-type-body-lg)'],
  ['size','font-size:18px','font-size:var(--voy-type-input)'],
  ['size','font-size:19px','font-size:var(--voy-type-metric-sm)'],
  ['size','font-size:21px','font-size:var(--voy-type-title-sm)'],
  ['size','font-size:28px','font-size:var(--voy-type-modal)'],
  ['size','font-size:30px','font-size:var(--voy-type-display-sm)'],
  ['size','font-size:32px','font-size:var(--voy-type-brand-lg)'],
  ['size','font-size:34px','font-size:var(--voy-type-display-md)'],
  ['size','font-size:38px','font-size:var(--voy-type-display-lg)'],
  ['size','font-size:clamp(22px,7vw,34px)','font-size:var(--voy-type-promise)'],
  ['size','font-size:clamp(30px,8vw,38px)','font-size:var(--voy-type-search)'],
  ['size','font-size:clamp(27px,8vw,34px)','font-size:var(--voy-type-sheet)'],
  ['size','font-size:clamp(30px,8vw,40px)','font-size:var(--voy-type-metric)'],
  ['leading','line-height:.92','line-height:var(--voy-leading-brand)'],
  ['leading','line-height:.95','line-height:var(--voy-leading-metric)'],
  ['leading','line-height:1.02','line-height:var(--voy-leading-display)'],
  ['leading','line-height:1.05','line-height:var(--voy-leading-title)'],
  ['leading','line-height:1.35','line-height:var(--voy-leading-snug)'],
  ['leading','line-height:1.5','line-height:var(--voy-leading-copy)'],
  ['leading','line-height:1.65','line-height:var(--voy-leading-reading)'],
  ['leading','line-height:12px','line-height:var(--voy-leading-12)'],
  ['leading','line-height:14px','line-height:var(--voy-leading-14)'],
  ['leading','line-height:15px','line-height:var(--voy-leading-15)'],
  ['leading','line-height:16px','line-height:var(--voy-leading-16)'],
  ['leading','line-height:17px','line-height:var(--voy-leading-17)'],
  ['leading','line-height:18px','line-height:var(--voy-leading-18)'],
  ['leading','line-height:19px','line-height:var(--voy-leading-19)'],
  ['leading','line-height:20px','line-height:var(--voy-leading-20)'],
  ['leading','line-height:21px','line-height:var(--voy-leading-21)'],
  ['leading','line-height:22px','line-height:var(--voy-leading-22)'],
  ['leading','line-height:23px','line-height:var(--voy-leading-23)'],
  ['tracking','letter-spacing:-.06em','letter-spacing:var(--voy-tracking-brand)'],
  ['tracking','letter-spacing:-.045em','letter-spacing:var(--voy-tracking-display)'],
  ['tracking','letter-spacing:-.035em','letter-spacing:var(--voy-tracking-dialog)'],
  ['tracking','letter-spacing:-.02em','letter-spacing:var(--voy-tracking-title)'],
  ['tracking','letter-spacing:-.01em','letter-spacing:var(--voy-tracking-input)'],
  ['tracking','letter-spacing:.02em','letter-spacing:var(--voy-tracking-context)'],
  ['tracking','letter-spacing:.08em','letter-spacing:var(--voy-tracking-label)'],
  ['tracking','letter-spacing:.09em','letter-spacing:var(--voy-tracking-kicker)'],
  ['tracking','letter-spacing:.1em','letter-spacing:var(--voy-tracking-eyebrow)'],
  ['border','border:1px solid var(--voy-border)','border:var(--voy-border-default)'],
  ['border','border-top:1px solid var(--voy-border)','border-top:var(--voy-border-default)'],
  ['border','border-bottom:1px solid var(--voy-border)','border-bottom:var(--voy-border-default)'],
  ['border','border-top:2px solid var(--voy-ink)','border-top:var(--voy-border-strong)'],
  ['border','outline:3px solid var(--voy-focus)','outline:var(--voy-focus-ring)'],
  ['control','min-height:44px','min-height:var(--voy-control-m)'],
  ['control','height:44px','height:var(--voy-control-m)'],
  ['control','min-height:48px','min-height:var(--voy-control-m)'],
  ['control','height:48px','height:var(--voy-control-m)'],
  ['control','min-height:58px','min-height:var(--voy-control-hero)'],
  ['control','min-height:68px','min-height:var(--voy-control-result)'],
  ['motion','.18s ease','var(--voy-motion-base) var(--voy-ease-standard)'],
  ['motion','.16s ease','var(--voy-motion-fast) var(--voy-ease-standard)'],
  ['z','z-index:1;','z-index:var(--voy-z-rail);'],
  ['z','z-index:1}','z-index:var(--voy-z-rail)}'],
  ['z','z-index:2;','z-index:var(--voy-z-marker);'],
  ['z','z-index:2}','z-index:var(--voy-z-marker)}'],
  ['z','z-index:3;','z-index:var(--voy-z-sheet);'],
  ['z','z-index:3}','z-index:var(--voy-z-sheet)}'],
  ['z','z-index:30;','z-index:var(--voy-z-banner);'],
  ['z','z-index:30}','z-index:var(--voy-z-banner)}'],
  ['z','z-index:50;','z-index:var(--voy-z-modal);'],
  ['z','z-index:50}','z-index:var(--voy-z-modal)}']
]) replaceAll(category, from, to);

for (const category of ['weight','size','leading','tracking','border','control','motion','z']) {
  if ((categoryCounts.get(category) || 0) < 1) throw new Error(`issue36_design_system_category_not_consumed:${category}`);
}
if (css === original) throw new Error('issue36_design_system_no_change');

const forbidden = [
  /font-weight:(?:500|650|680|700|720|750|760|800|900)(?=[;}])/,
  /(?:\.16s|\.18s) ease/,
  /z-index:(?:1|2|3|30|50)(?=[;}])/
];
for (const pattern of forbidden) {
  if (pattern.test(css)) throw new Error(`issue36_design_system_stale_primitive:${pattern}`);
}

writeFileSync(path, css, 'utf8');
console.log(JSON.stringify({ result:'PASS', file:path, categoryCounts:Object.fromEntries(categoryCounts), replacementCount:applied.reduce((sum,item)=>sum+item.count,0), replacements:applied }, null, 2));
