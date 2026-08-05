#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const source = process.env.DEPLOY_CONFIG;
const target = process.env.CANDIDATE_CONFIG;
const shortSha = process.env.SHORT_SHA;

if (!source || !target || !shortSha) {
  throw new Error('candidate_config_environment_missing');
}

const config = JSON.parse(readFileSync(source, 'utf8'));
if (typeof config.main !== 'string' || !config.main) throw new Error('candidate_main_missing');
if (!config.assets || typeof config.assets.directory !== 'string') throw new Error('candidate_assets_missing');
if ('auxiliaryWorkers' in config) throw new Error('candidate_internal_vite_field_present');
config.vars ||= {};
config.vars.VOY_BUILD_HASH = shortSha;
writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`);
