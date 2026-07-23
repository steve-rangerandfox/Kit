/**
 * Pilots — deterministic evidence-completeness gate.
 *
 * Pure, no I/O. This is the authoritative definition of "enough evidence to
 * finalize", enforced in the state-transition owner (transitions.ts / service),
 * NOT only in UI or prompt wording. A pilot cannot reach a final recommendation
 * state unless this function returns complete=true.
 *
 * The gate is keyed by pilot_type; only 'visual_development' exists today. Adding
 * a pilot type means adding its requirement set here — the mechanism generalizes,
 * the requirements do not leak into the schema.
 */

import {
  REQUIRED_MEASUREMENT_KEYS,
  type PilotSnapshot,
  type PilotType,
} from './types'

export interface MissingRequirement {
  /** Stable machine key for the unmet requirement. */
  key: string
  /** Human-readable explanation of what is missing. */
  detail: string
}

export interface CompletenessResult {
  complete: boolean
  missing: MissingRequirement[]
}

/**
 * Evaluate whether a pilot has recorded every required evidence class. Every
 * required class produces a distinct MissingRequirement when absent, so the
 * caller can tell the artist exactly what remains.
 */
export function evaluateCompleteness(snapshot: PilotSnapshot): CompletenessResult {
  const type = snapshot.pilot.pilot_type
  switch (type) {
    case 'visual_development':
      return evaluateVisualDevelopment(snapshot)
    default:
      // Unknown type: refuse to certify completeness rather than pass by default.
      return {
        complete: false,
        missing: [{ key: 'unknown_pilot_type', detail: `No completeness definition for pilot_type '${type as string}'` }],
      }
  }
}

function evaluateVisualDevelopment(s: PilotSnapshot): CompletenessResult {
  const missing: MissingRequirement[] = []
  const refs = s.references
  const gens = s.generations

  // Pinterest research: at least one.
  if (!refs.some((r) => r.ref_type === 'pinterest')) {
    missing.push({ key: 'pinterest_reference', detail: 'At least one Pinterest research reference is required' })
  }

  // Exactly one designated Figma moodboard (the DB enforces "at most one"; the
  // gate enforces "exactly one" for finalization).
  const figma = refs.filter((r) => r.ref_type === 'figma_moodboard')
  if (figma.length !== 1) {
    missing.push({
      key: 'figma_moodboard',
      detail: `Exactly one designated Figma moodboard is required (found ${figma.length})`,
    })
  }

  // Visual-language definition (non-empty).
  if (!nonEmpty(s.pilot.visual_language)) {
    missing.push({ key: 'visual_language', detail: 'A visual-language definition is required' })
  }

  // At least one deliberately recorded styleframe direction.
  if (!refs.some((r) => r.ref_type === 'styleframe_direction')) {
    missing.push({ key: 'styleframe_direction', detail: 'At least one styleframe direction must be recorded' })
  }

  // At least one generation output.
  if (gens.length === 0) {
    missing.push({ key: 'generation_output', detail: 'At least one generation output is required' })
  }

  // At least one HUMAN-accepted usable output.
  if (!gens.some((g) => g.acceptance === 'accepted')) {
    missing.push({ key: 'accepted_output', detail: 'At least one human-accepted usable output is required' })
  }

  // At least one material package (a distinct package_name).
  const packages = new Set(s.materialMaps.map((m) => m.package_name))
  if (packages.size === 0) {
    missing.push({ key: 'material_package', detail: 'At least one material package is required' })
  }
  // Every recorded map carries a purpose — structurally guaranteed by the schema
  // (purpose NOT NULL + non-empty), so a map without a purpose cannot exist.

  // Cinema 4D / Redshift validation evidence: at least one of each tool, each
  // carrying recorded evidence (evidence_ref is NOT NULL by schema).
  if (!s.validations.some((v) => v.tool === 'cinema4d')) {
    missing.push({ key: 'cinema4d_validation', detail: 'Cinema 4D validation evidence is required' })
  }
  if (!s.validations.some((v) => v.tool === 'redshift')) {
    missing.push({ key: 'redshift_validation', detail: 'Redshift validation evidence is required' })
  }

  // Required objective measurements — each metric_key present as a measurement.
  const measuredKeys = new Set(
    s.evidence.filter((e) => e.category === 'measurement' && e.metric_key).map((e) => e.metric_key as string),
  )
  for (const key of REQUIRED_MEASUREMENT_KEYS) {
    if (!measuredKeys.has(key)) {
      missing.push({ key: `measurement:${key}`, detail: `Measurement '${key}' is required` })
    }
  }

  // Unresolved assumptions and unknowns MUST be explicitly recorded — even when
  // the correct value is "none identified". We require at least one evidence row
  // of each category so the artist has affirmatively addressed them (a "none
  // identified" row is a valid, explicit record).
  if (!s.evidence.some((e) => e.category === 'assumption')) {
    missing.push({ key: 'assumptions_recorded', detail: 'Assumptions must be explicitly recorded (use "none identified" if so)' })
  }
  if (!s.evidence.some((e) => e.category === 'unknown')) {
    missing.push({ key: 'unknowns_recorded', detail: 'Unknowns must be explicitly recorded (use "none identified" if so)' })
  }

  // Supporting evidence for the final recommendation: at least one 'decision'
  // evidence row capturing the rationale/support.
  if (!s.evidence.some((e) => e.category === 'decision')) {
    missing.push({
      key: 'recommendation_support',
      detail: 'Supporting evidence (a decision record) for the recommendation is required',
    })
  }

  return { complete: missing.length === 0, missing }
}

function nonEmpty(v: string | null | undefined): boolean {
  return typeof v === 'string' && v.trim().length > 0
}

/** All pilot types the gate understands — for tooling/tests. */
export const KNOWN_PILOT_TYPES: readonly PilotType[] = ['visual_development'] as const
