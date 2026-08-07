#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const [reportPath, systemErrorsPath, outputPath] = process.argv.slice(2);
if (!reportPath || !systemErrorsPath || !outputPath) throw new Error('usage: evaluate-gtfs-report.mjs <report.json> <system_errors.json> <summary.json>');
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const systemErrors = JSON.parse(readFileSync(systemErrorsPath, 'utf8'));
const notices = [];

function walk(value) {
  if (Array.isArray(value)) { for (const item of value) walk(item); return; }
  if (!value || typeof value !== 'object') return;
  const severity = typeof value.severity === 'string' ? value.severity.toUpperCase() : null;
  if (severity === 'ERROR' || severity === 'WARNING' || severity === 'INFO') {
    const code = String(value.code ?? value.noticeCode ?? value.name ?? value.type ?? 'UNCLASSIFIED');
    const count = Number(value.totalNotices ?? value.count ?? 1);
    notices.push({ severity, code, count: Number.isFinite(count) && count > 0 ? count : 1 });
  }
  for (const item of Object.values(value)) walk(item);
}
walk(report);

function countSystemErrors(value) {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== 'object') return 0;
  if (Array.isArray(value.notices)) return value.notices.length;
  return Object.values(value).reduce((total, item) => total + countSystemErrors(item), 0);
}

const systemErrorCount = countSystemErrors(systemErrors);
const totals = { ERROR: 0, WARNING: 0, INFO: 0 };
for (const notice of notices) totals[notice.severity] += notice.count;
const warningCodes = [...new Set(notices.filter(item => item.severity === 'WARNING').map(item => item.code))].sort();
const errorCodes = [...new Set(notices.filter(item => item.severity === 'ERROR').map(item => item.code))].sort();
const summary = {
  result: totals.ERROR === 0 && systemErrorCount === 0 ? 'PASS' : 'BLOCK',
  validator: 'MobilityData gtfs-validator',
  validator_version: '8.0.1',
  validator_sha256: '19293ddd9b6f954f216d4f12054bd8a3232921751c4484339e339764a91000e2',
  hard_errors: totals.ERROR,
  system_errors: systemErrorCount,
  warnings: totals.WARNING,
  warning_codes: warningCodes,
  error_codes: errorCodes,
  warning_policy: 'CLASSIFIED_AND_PERSISTED_NOT_SILENTLY_IGNORED'
};
writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (summary.result !== 'PASS') process.exit(2);
