/**
 * Pilots — orchestration over injected ports.
 *
 * This is the state-transition owner. Every mutating operation enforces its
 * invariant HERE (attribution, acceptance-not-by-default, the deterministic
 * completeness gate before finalization, authorization that never trusts button
 * visibility) and delegates persistence to a PilotStorePort and Canvas I/O to a
 * PilotCanvasPort. Both ports are injected so the guarantees are unit-tested with
 * in-memory fakes, not a live Supabase/Slack. `defaultPilotDeps()` wires the real
 * store + canvas for the Bolt handler.
 */

import { pilotCanvasTitle } from './canvas'
import { renderPilotCanvas } from './render'
import { authorizePilotAction, decideFinalize, type FinalizeDecision } from './transitions'
import type {
  EvidenceCategory,
  EvidenceRow,
  GenerationRow,
  MaterialMapRow,
  MaterialMapType,
  PilotRow,
  PilotSnapshot,
  ReferenceRow,
  ReferenceType,
  ValidationRow,
  ValidationTool,
} from './types'

// ─── Ports ───────────────────────────────────────────────────────────────────

export interface PilotStorePort {
  getPilotById(id: string): Promise<PilotRow | null>
  getActivePilot(projectId: string, pilotType: string): Promise<PilotRow | null>
  insertPilot(v: {
    project_id: string
    workspace_id: string | null
    pilot_type: string
    title: string | null
    created_by: string | null
  }): Promise<PilotRow>
  updatePilot(id: string, patch: Partial<PilotRow>): Promise<void>
  insertReference(v: Omit<ReferenceRow, 'id' | 'created_at'>): Promise<ReferenceRow>
  insertEvidence(v: Omit<EvidenceRow, 'id' | 'created_at'>): Promise<EvidenceRow>
  insertGeneration(
    v: Omit<GenerationRow, 'id' | 'created_at' | 'acceptance' | 'accepted_by' | 'accepted_at'>,
  ): Promise<GenerationRow>
  getGenerationById(id: string): Promise<GenerationRow | null>
  setGenerationAcceptance(
    id: string,
    patch: { acceptance: 'accepted' | 'rejected'; accepted_by: string | null; accepted_at: string | null },
  ): Promise<void>
  insertMaterialMap(v: Omit<MaterialMapRow, 'id' | 'created_at'>): Promise<MaterialMapRow>
  insertValidation(v: Omit<ValidationRow, 'id' | 'created_at'>): Promise<ValidationRow>
  loadSnapshot(pilotId: string): Promise<PilotSnapshot | null>
}

export interface PilotCanvasPort {
  createPilotCanvas(o: { channelId: string; title: string; markdown: string }): Promise<{ canvasId: string; canvasUrl: string | null }>
  editPilotCanvas(o: { canvasId: string; title: string; markdown: string }): Promise<void>
}

export interface PilotDeps {
  store: PilotStorePort
  canvas: PilotCanvasPort
  now: () => string
}

// `defaultPilotDeps()` (the real Supabase/Slack wiring) lives in ./defaults so
// this orchestration module stays free of I/O imports and is unit-testable
// without the Supabase client installed.

// ─── Results ─────────────────────────────────────────────────────────────────

export type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string; detail?: unknown }

function ok<T>(value: T): ServiceResult<T> {
  return { ok: true, value }
}
function fail<T>(reason: string, detail?: unknown): ServiceResult<T> {
  return { ok: false, reason, detail }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createVisualDevPilot(
  deps: PilotDeps,
  args: { projectId: string; workspaceId: string | null; title: string | null; createdBy: string | null },
): Promise<ServiceResult<PilotRow>> {
  // Defensive pre-check mirroring the DB partial-unique index: at most one active
  // pilot of this type per project. The index is the authoritative guarantee;
  // this returns a friendly reason before hitting the constraint.
  const existing = await deps.store.getActivePilot(args.projectId, 'visual_development')
  if (existing) return fail('active_pilot_exists', existing.id)
  const pilot = await deps.store.insertPilot({
    project_id: args.projectId,
    workspace_id: args.workspaceId,
    pilot_type: 'visual_development',
    title: args.title,
    created_by: args.createdBy,
  })
  return ok(pilot)
}

// ─── References ──────────────────────────────────────────────────────────────

export async function addReference(
  deps: PilotDeps,
  args: {
    pilotId: string
    refType: ReferenceType
    url?: string | null
    label?: string | null
    description?: string | null
    author: string
    provenance?: Record<string, unknown> | null
  },
): Promise<ServiceResult<ReferenceRow>> {
  if (!args.author) return fail('author_required')
  if ((args.refType === 'pinterest' || args.refType === 'figma_moodboard') && !args.url) {
    return fail('url_required')
  }
  const row = await deps.store.insertReference({
    pilot_id: args.pilotId,
    ref_type: args.refType,
    url: args.url ?? null,
    label: args.label ?? null,
    description: args.description ?? null,
    provenance: args.provenance ?? null,
    author: args.author,
  })
  return ok(row)
}

// ─── Visual language ─────────────────────────────────────────────────────────

export async function setVisualLanguage(
  deps: PilotDeps,
  args: { pilotId: string; text: string },
): Promise<ServiceResult<null>> {
  if (!args.text || !args.text.trim()) return fail('empty_visual_language')
  await deps.store.updatePilot(args.pilotId, { visual_language: args.text })
  return ok(null)
}

// ─── Evidence (append-only) ──────────────────────────────────────────────────

export async function recordEvidence(
  deps: PilotDeps,
  args: {
    pilotId: string
    category: EvidenceCategory
    author: string
    metricKey?: string | null
    label?: string | null
    valueNumeric?: number | null
    valueText?: string | null
    unit?: string | null
    observedAt?: string | null
    provenance?: Record<string, unknown> | null
  },
): Promise<ServiceResult<EvidenceRow>> {
  if (!args.author) return fail('author_required')
  // Measurements must carry a stable metric_key AND a structured value, so a
  // subjective note can never be filed as an objective measurement.
  if (args.category === 'measurement') {
    if (!args.metricKey) return fail('measurement_requires_metric_key')
    if (args.valueNumeric == null && !nonEmpty(args.valueText)) return fail('measurement_requires_value')
  }
  const row = await deps.store.insertEvidence({
    pilot_id: args.pilotId,
    category: args.category,
    metric_key: args.metricKey ?? null,
    label: args.label ?? null,
    value_numeric: args.valueNumeric ?? null,
    value_text: args.valueText ?? null,
    unit: args.unit ?? null,
    observed_at: args.observedAt ?? null,
    provenance: args.provenance ?? null,
    author: args.author,
  })
  return ok(row)
}

// ─── Generations + acceptance ────────────────────────────────────────────────

export async function recordGeneration(
  deps: PilotDeps,
  args: {
    pilotId: string
    author: string
    source?: string | null
    kind?: string | null
    externalRef?: string | null
    label?: string | null
    notes?: string | null
    provenance?: Record<string, unknown> | null
  },
): Promise<ServiceResult<GenerationRow>> {
  if (!args.author) return fail('author_required')
  const row = await deps.store.insertGeneration({
    pilot_id: args.pilotId,
    source: args.source ?? null,
    kind: args.kind ?? null,
    external_ref: args.externalRef ?? null,
    label: args.label ?? null,
    notes: args.notes ?? null,
    provenance: args.provenance ?? null,
    author: args.author,
  })
  return ok(row)
}

/**
 * Explicit, attributed human acceptance/rejection. Nothing is accepted by
 * default; an acceptance records the accepting human + timestamp. Authorization
 * is workspace-scoped and never relies on button visibility.
 */
export async function decideGenerationAcceptance(
  deps: PilotDeps,
  args: { generationId: string; accept: boolean; actingUserId: string; workspaceId: string },
): Promise<ServiceResult<null>> {
  const gen = await deps.store.getGenerationById(args.generationId)
  if (!gen) return fail('generation_not_found')
  const pilot = await deps.store.getPilotById(gen.pilot_id)
  const auth = authorizePilotAction(pilot, { actingUserId: args.actingUserId, workspaceId: args.workspaceId })
  if (!auth.ok) return fail(`unauthorized:${auth.reason}`)
  if (pilot!.status !== 'active') return fail('pilot_not_active')
  if (args.accept) {
    await deps.store.setGenerationAcceptance(args.generationId, {
      acceptance: 'accepted',
      accepted_by: args.actingUserId,
      accepted_at: deps.now(),
    })
  } else {
    await deps.store.setGenerationAcceptance(args.generationId, {
      acceptance: 'rejected',
      accepted_by: args.actingUserId,
      accepted_at: deps.now(),
    })
  }
  return ok(null)
}

// ─── Material maps ───────────────────────────────────────────────────────────

export async function recordMaterialMap(
  deps: PilotDeps,
  args: {
    pilotId: string
    packageName: string
    mapType: MaterialMapType
    purpose: string
    author: string
    externalRef?: string | null
    provenance?: Record<string, unknown> | null
  },
): Promise<ServiceResult<MaterialMapRow>> {
  if (!args.author) return fail('author_required')
  if (!nonEmpty(args.packageName)) return fail('package_name_required')
  // Every map must state a production purpose (also NOT NULL/non-empty in the DB).
  if (!nonEmpty(args.purpose)) return fail('purpose_required')
  const row = await deps.store.insertMaterialMap({
    pilot_id: args.pilotId,
    package_name: args.packageName,
    map_type: args.mapType,
    purpose: args.purpose,
    external_ref: args.externalRef ?? null,
    provenance: args.provenance ?? null,
    author: args.author,
  })
  return ok(row)
}

// ─── Technical validation ────────────────────────────────────────────────────

export async function recordValidation(
  deps: PilotDeps,
  args: {
    pilotId: string
    tool: ValidationTool
    evidenceRef: string
    passed: boolean
    author: string
    subject?: string | null
    note?: string | null
    provenance?: Record<string, unknown> | null
  },
): Promise<ServiceResult<ValidationRow>> {
  if (!args.author) return fail('author_required')
  // Technical validity requires RECORDED evidence (also NOT NULL/non-empty in DB).
  if (!nonEmpty(args.evidenceRef)) return fail('evidence_ref_required')
  const row = await deps.store.insertValidation({
    pilot_id: args.pilotId,
    tool: args.tool,
    evidence_ref: args.evidenceRef,
    passed: args.passed,
    subject: args.subject ?? null,
    note: args.note ?? null,
    provenance: args.provenance ?? null,
    author: args.author,
  })
  return ok(row)
}

// ─── Finalization (completeness-gated) ───────────────────────────────────────

export async function finalizeRecommendation(
  deps: PilotDeps,
  args: {
    pilotId: string
    recommendation: string
    rationale: string | null
    actingUserId: string
    workspaceId: string
  },
): Promise<ServiceResult<PilotRow> & { finalize?: FinalizeDecision }> {
  const snapshot = await deps.store.loadSnapshot(args.pilotId)
  if (!snapshot) return fail('pilot_not_found')
  const auth = authorizePilotAction(snapshot.pilot, {
    actingUserId: args.actingUserId,
    workspaceId: args.workspaceId,
  })
  if (!auth.ok) return fail(`unauthorized:${auth.reason}`)

  const decision = decideFinalize(snapshot, args.recommendation)
  if (!decision.ok) {
    return { ...fail('finalize_blocked', decision), finalize: decision }
  }

  // The recommendation is entered by the authorized human and simply persisted —
  // never generated or chosen by a model.
  await deps.store.updatePilot(args.pilotId, {
    status: 'finalized',
    recommendation: decision.recommendation,
    recommendation_rationale: args.rationale,
    recommendation_by: args.actingUserId,
    recommendation_at: deps.now(),
  })
  const updated = await deps.store.getPilotById(args.pilotId)
  return ok(updated as PilotRow)
}

// ─── Canvas projection ───────────────────────────────────────────────────────

/**
 * Deterministically (re)render the pilot's dedicated read-only Canvas from the
 * authoritative snapshot. Creates the canvas on first render, edits it
 * thereafter — the canvas identity is persisted on the pilot row.
 */
export async function refreshPilotCanvas(
  deps: PilotDeps,
  args: { pilotId: string; channelId: string },
): Promise<ServiceResult<{ canvasId: string; canvasUrl: string | null }>> {
  const snapshot = await deps.store.loadSnapshot(args.pilotId)
  if (!snapshot) return fail('pilot_not_found')
  const markdown = renderPilotCanvas(snapshot)
  const title = pilotCanvasTitle(snapshot.pilot.title || 'Pilot')
  if (snapshot.pilot.canvas_id) {
    await deps.canvas.editPilotCanvas({ canvasId: snapshot.pilot.canvas_id, title, markdown })
    return ok({ canvasId: snapshot.pilot.canvas_id, canvasUrl: snapshot.pilot.canvas_url })
  }
  const handle = await deps.canvas.createPilotCanvas({ channelId: args.channelId, title, markdown })
  await deps.store.updatePilot(args.pilotId, { canvas_id: handle.canvasId, canvas_url: handle.canvasUrl })
  return ok(handle)
}

function nonEmpty(v: string | null | undefined): boolean {
  return typeof v === 'string' && v.trim().length > 0
}
