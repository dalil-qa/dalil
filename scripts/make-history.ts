// Builds app/src/data/history.json from scripts/story.json (APP_BUILD_GUIDE.md 5.3).
// Run from the dalil folder:  node scripts/make-history.ts
// Fixed random seeds, so the history is identical on every laptop. No red flags or emergencies in it.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type Keyframes = [number, number][];
interface Story {
  water_ml: number;
  exercise_min: number;
  crew: Record<string, {
    preflight: Record<string, number>;
    fields: Record<string, Keyframes>;
    symptoms: [number, string[]][];
  }>;
}

const here = dirname(fileURLToPath(import.meta.url));
const story = JSON.parse(readFileSync(join(here, 'story.json'), 'utf-8')) as Story;

/** Small seeded random generator (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Straight-line value between keyframes (flat before the first and after the last). */
function at(frames: Keyframes, day: number): number {
  if (day <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [d1, v1] = frames[i];
    const [d0, v0] = frames[i - 1];
    if (day <= d1) return d1 === d0 ? v1 : v0 + ((v1 - v0) * (day - d0)) / (d1 - d0);
  }
  return frames[frames.length - 1][1];
}

const round = (v: number, places = 0) => Math.round(v * 10 ** places) / 10 ** places;
const keyDays = (frames: Keyframes) => new Set(frames.map(([d]) => d));

const LAST_DAY = 47;
const PREFLIGHT_DAYS = [-14, -10, -7, -4, -1];
const readings: [string, number, string, number][] = [];
const symptoms: [string, number, string[]][] = [];

let seed = 1;
for (const [crewId, c] of Object.entries(story.crew)) {
  const rand = rng(seed++ * 7919);
  const noise = (amount: number, day: number, frames: Keyframes) => (keyDays(frames).has(day) ? 0 : (rand() - 0.5) * 2 * amount);

  for (const day of PREFLIGHT_DAYS) {
    const p = c.preflight;
    readings.push([crewId, day, 'hr', round(p.hr + (rand() - 0.5) * 2)]);
    readings.push([crewId, day, 'spo2', Math.min(100, round(p.spo2 + (rand() - 0.5) * 2))]);
    readings.push([crewId, day, 'temp', round(p.temp + (rand() - 0.5) * 0.4, 1)]);
    readings.push([crewId, day, 'bp_sys', round(p.bp_sys + (rand() - 0.5) * 4)]);
    readings.push([crewId, day, 'bp_dia', round(p.bp_dia + (rand() - 0.5) * 3)]);
  }

  const f = c.fields;
  for (let day = 1; day <= LAST_DAY; day++) {
    // Morning station check.
    // Heart rate varies by only +-1 so a story step like 64 -> 74 always clears the 8 bpm band.
    readings.push([crewId, day, 'hr', round(at(f.hr, day) + noise(1, day, f.hr))]);
    readings.push([crewId, day, 'spo2', Math.min(100, round(at(f.spo2, day) + noise(1, day, f.spo2)))]);
    readings.push([crewId, day, 'temp', round(at(f.temp, day) + noise(0.2, day, f.temp), 1)]);
    // Evening log.
    readings.push([crewId, day, 'sleep', round(at(f.sleep, day) + noise(0.5, day, f.sleep), 1)]);
    readings.push([crewId, day, 'mood', Math.max(1, Math.min(5, round(at(f.mood, day) + noise(0.6, day, f.mood))))]);
    const waterFrames = f.water ?? [[1, story.water_ml]];
    readings.push([crewId, day, 'water', round(at(waterFrames, day) + noise(150, day, waterFrames), 0)]);
    readings.push([crewId, day, 'exercise', round(story.exercise_min + noise(10, day, [[1, 0]]))]);
    readings.push([crewId, day, 'meals', Math.max(0, Math.min(3, round(at(f.meals, day))))]);
    if (day % 3 === 0 || day === LAST_DAY) {
      readings.push([crewId, day, 'bp_sys', round(at(f.bp_sys, day) + noise(3, day, f.bp_sys))]);
      readings.push([crewId, day, 'bp_dia', round(at(f.bp_dia, day) + noise(2, day, f.bp_dia))]);
    }
  }
  for (const [day, ids] of c.symptoms) symptoms.push([crewId, day, ids]);
}

const out = join(here, '..', 'app', 'src', 'data', 'history.json');
writeFileSync(out, JSON.stringify({ lastDay: LAST_DAY, readings, symptoms }) + '\n');
console.log(`Wrote ${readings.length} readings and ${symptoms.length} symptom logs to ${out}`);
