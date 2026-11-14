// Typed access to the content files in this folder (APP_BUILD_GUIDE.md section 5).
// Drafted from NASA documents and public health pages; see docs/CONTENT_REVIEW.md for sources, team defaults and sign-off.
// Keep the shapes: the guide (section 5) and the tests in content.test.ts rely on them.
import type { BodySystem, CrewMember, EmergencyContent, GuidanceCard, IndicatorId, Mission, MissionId, SymptomId, SymptomInfo, Threshold } from '../types.ts';
import cardsJson from './cards.json' with { type: 'json' };
import crewJson from './crew.json' with { type: 'json' };
import emergencyJson from './emergency.json' with { type: 'json' };
import missionsJson from './missions.json' with { type: 'json' };
import symptomsJson from './symptoms.json' with { type: 'json' };
import systemsJson from './systems.json' with { type: 'json' };
import thresholdsJson from './thresholds.json' with { type: 'json' };

export const thresholds = thresholdsJson as Threshold[];
export const cards = cardsJson as GuidanceCard[];
export const systems = systemsJson as BodySystem[];
export const crew = crewJson as CrewMember[];
export const missions = missionsJson as Mission[];
export const symptoms = symptomsJson as SymptomInfo[];
export const emergencyContent = emergencyJson as EmergencyContent;

export function thresholdFor(indicator: IndicatorId): Threshold | undefined {
  return thresholds.find((t) => t.indicator === indicator);
}

export function cardById(id: string): GuidanceCard | undefined {
  return cards.find((c) => c.id === id);
}

export function crewById(id: string): CrewMember {
  return crew.find((c) => c.id === id) ?? crew[crew.length - 1];
}

export function missionById(id: MissionId): Mission {
  return missions.find((m) => m.id === id) ?? missions[0];
}

export function symptomById(id: SymptomId): SymptomInfo | undefined {
  return symptoms.find((s) => s.id === id);
}

export const redFlagSymptoms = symptoms.filter((s) => s.redFlag);
