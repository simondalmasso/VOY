import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/styles/global.css';
let css = readFileSync(path, 'utf8');
const original = css;
const applied = [];

function replaceAll(from, to, minimum = 1) {
  const count = css.split(from).length - 1;
  if (count < minimum) throw new Error(`issue36_design_system_pattern_missing:${from}:${count}<${minimum}`);
  css = css.split(from).join(to);
  applied.push({ from, to, count });
}

// Typography families live in tokens.css; consume repeated weights/sizes/leading/tracking here.
for (const [from, to] of [
  ['font-weight:500', 'font-weight:var(--voy-weight-regular)'],
  ['font-weight:650', 'font-weight:var(--voy-weight-label)'],
  ['font-weight:680', 'font-weight:var(--voy-weight-result)'],
  ['font-weight:700', 'font-weight:var(--voy-weight-bold)'],
  ['font-weight:720', 'font-weight:var(--voy-weight-display)'],
  ['font-weight:750', 'font-weight:var(--voy-weight-strong)'],
  ['font-weight:760', 'font-weight:var(--voy-weight-metric)'],
  ['font-weight:800', 'font-weight:var(--voy-weight-heavy)'],
  ['font-weight:900', 'font-weight:var(--voy-weight-black)'],
  ['font-size:10px', 'font-size:var(--voy-type-overline)'],
  ['font-size:11px', 'font-size:var(--voy-type-eyebrow)'],
  ['font-size:12px', 'font-size:var(--voy-type-caption)'],
  ['font-size:13px', 'font-size:var(--voy-type-label)'],
  ['font-size:14px', 'font-size:var(--voy-type-control)'],
  ['font-size:15px', 'font-size:var(--voy-type-body-sm)'],
  ['font-size:16px', 'font-size:var(--voy-type-body)'],
  ['font-size:17px', 'font-size:var(--voy-type-body-lg)'],
  ['font-size:18px', 'font-size:var(--voy-type-input)'],
  ['font-size:19px', 'font-size:var(--voy-type-metric-sm)'],
  ['font-size:21px', 'font-size:var(--voy-type-title-sm)'],
  ['font-size:28px', 'font-size:var(--voy-type-modal)'],
  ['font-size:30px', 'font-size:var(--voy-type-display-sm)'],
  ['font-size:32px', 'font-size:var(--voy-type-brand-lg)'],
  ['font-size:34px', 'font-size:var(--voy-type-display-md)'],
  ['font-size:38px', 'font-size:var(--voy-type-display-lg)'],
  ['font-size:clamp(22px,7vw,34px)', 'font-size:var(--voy-type-promise)'],
  ['font-size:clamp(30px,8vw,38px)', 'font-size:var(--voy-type-search)'],
  ['font-size:clamp(27px,8vw,34px)', 'font-size:var(--voy-type-sheet)'],
  ['font-size:clamp(30px,8vw,40px)', 'font-size:var(--voy-type-metric)'],
  ['line-height:.92', 'line-height:var(--voy-leading-brand)'],
  ['line-height:.95', 'line-height:var(--voy-leading-metric)'],
  ['line-height:1.02', 'line-height:var(--voy-leading-display)'],
  ['line-height:1.05', 'line-height:var(--voy-leading-title)'],
  ['line-height:1.35', 'line-height:var(--voy-leading-snug)'],
  ['line-height:1.5', 'line-height:var(--voy-leading-copy)'],
  ['line-height:1.65', 'line-height:var(--voy-leading-reading)'],
  ['line-height:12px', 'line-height:var(--voy-leading-12)'],
  ['line-height:14px', 'line-height:var(--voy-leading-14)'],
  ['line-height:15px', 'line-height:var(--voy-leading-15)'],
  ['line-height:16px', 'line-height:var(--voy-leading-16)'],
  ['line-height:17px', 'line-height:var(--voy-leading-17)'],
  ['line-height:18px', 'line-height:var(--voy-leading-18)'],
  ['line-height:19px', 'line-height:var(--voy-leading-19)'],
  ['line-height:20px', 'line-height:var(--voy-leading-20)'],
  ['line-height:21px', 'line-height:var(--voy-leading-21)'],
  ['line-height:22px', 'line-height:var(--voy-leading-22)'],
  ['line-height:23px', 'line-height:var(--voy-leading-23)'],
  ['letter-spacing:-.06em', 'letter-spacing:var(--voy-tracking-brand)'],
  ['letter-spacing:-.045em', 'letter-spacing:var(--voy-tracking-display)'],
  ['letter-spacing:-.035em', 'letter-spacing:var(--voy-tracking-dialog)'],
  ['letter-spacing:-.02em', 'letter-spacing:var(--voy-tracking-title)'],
  ['letter-spacing:-.01em', 'letter-spacing:var(--voy-tracking-input)'],
  ['letter-spacing:.02em', 'letter-spacing:var(--voy-tracking-context)'],
  ['letter-spacing:.08em', 'letter-spacing:var(--voy-tracking-label)'],
  ['letter-spacing:.09em', 'letter-spacing:var(--voy-tracking-kicker)'],
  ['letter-spacing:.1em', 'letter-spacing:var(--voy-tracking-eyebrow)']
]) replaceAll(from, to);

// Border primitives.
replaceAll('border:1px solid var(--voy-border)', 'border:var(--voy-border-default)');
replaceAll('border-top:1px solid var(--voy-border)', 'border-top:var(--voy-border-default)');
replaceAll('border-bottom:1px solid var(--voy-border)', 'border-bottom:var(--voy-border-default)');
replaceAll('border-top:2px solid var(--voy-ink)', 'border-top:var(--voy-border-strong)');
replaceAll('outline:3px solid var(--voy-focus)', 'outline:var(--voy-focus-ring)');

// Control-height primitives that are intentionally shared across the UI.
replaceAll('min-height:44px', 'min-height:var(--voy-control-m)');
replaceAll('height:44px', 'height:var(--voy-control-m)');
replaceAll('min-height:48px', 'min-height:var(--voy-control-m)');
replaceAll('height:48px', 'height:var(--voy-control-m)');
replaceAll('min-height:58px', 'min-height:var(--voy-control-hero)');
replaceAll('min-height:68px', 'min-height:var(--voy-control-result)');

// Motion and layering primitives.
replaceAll('.18s ease', 'var(--voy-motion-base) var(--voy-ease-standard)');
replaceAll('.16s ease', 'var(--voy-motion-fast) var(--voy-ease-standard)');
replaceAll('z-index:1', 'z-index:var(--voy-z-rail)');
replaceAll('z-index:2', 'z-index:var(--voy-z-marker)');
replaceAll('z-index:3', 'z-index:var(--voy-z-sheet)');
replaceAll('z-index:30', 'z-index:var(--voy-z-banner)');
replaceAll('z-index:50', 'z-index:var(--voy-z-modal)');

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
console.log(JSON.stringify({ result: 'PASS', file: path, replacements: applied, replacementCount: applied.reduce((sum, item) => sum + item.count, 0) }, null, 2));
