import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('ORDER-046 voice territorial scope', () => {
  test('UI requires verified Santa Fe origin context and closes voice outside that overlay', () => {
    const app = readFileSync('src/App.svelte', 'utf8');
    expect(app).toContain("originTerritory?.coverageKey === 'santa-fe'");
    expect(app).toContain("(!selectedDestination || selectedDestination.coverageKey === 'santa-fe')");
    expect(app).toContain("if (!voiceSantaFeEligible && voiceOpen) voiceOpen = false");
    expect(app).toContain('capabilities?.voice && voiceSantaFeEligible && !voiceOpen');
    expect(app).toContain('Asistente VOY · Santa Fe');
  });

  test('voice session itself remains explicitly Santa Fe and does not infer a national city', () => {
    const client = readFileSync('src/features/voice/voice.client.ts', 'utf8');
    expect(client).toContain("JSON.stringify({ city_id: 'santafe' })");
    expect(client).not.toContain('city_id: territory');
    expect(client).not.toContain('city_id: selectedDestination');
  });
});
