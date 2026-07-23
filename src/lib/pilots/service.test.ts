/**
 * Service guard tests (attribution, acceptance-not-by-default, uniqueness
 * pre-check, measurement/purpose/evidence guards, completeness-gated finalize).
 *
 * Run: npx tsx --test src/lib/pilots/service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { makeFakePilotStore, makeFakeCanvas } from './fake-store'
import {
  addReference,
  createVisualDevPilot,
  decideGenerationAcceptance,
  finalizeRecommendation,
  recordEvidence,
  recordGeneration,
  recordMaterialMap,
  recordValidation,
  type PilotDeps,
} from './service'

function deps(): PilotDeps & { store: ReturnType<typeof makeFakePilotStore> } {
  const store = makeFakePilotStore()
  return { store, canvas: makeFakeCanvas(), now: () => '2026-02-02T00:00:00.000Z' }
}

async function newPilot(d: PilotDeps) {
  const res = await createVisualDevPilot(d, { projectId: 'proj', workspaceId: 'ws', title: 'T', createdBy: 'u' })
  assert.ok(res.ok)
  return (res as { ok: true; value: { id: string } }).value.id
}

describe('createVisualDevPilot', () => {
  it('enforces at most one active pilot per project (pre-check)', async () => {
    const d = deps()
    await newPilot(d)
    const second = await createVisualDevPilot(d, { projectId: 'proj', workspaceId: 'ws', title: 'T2', createdBy: 'u' })
    assert.equal(second.ok, false)
    assert.equal(second.ok === false && second.reason, 'active_pilot_exists')
  })

  it('allows a new pilot for a different project', async () => {
    const d = deps()
    await newPilot(d)
    const other = await createVisualDevPilot(d, { projectId: 'proj2', workspaceId: 'ws', title: 'T', createdBy: 'u' })
    assert.equal(other.ok, true)
  })
})

describe('addReference', () => {
  it('requires a url for pinterest and figma moodboard', async () => {
    const d = deps()
    const p = await newPilot(d)
    assert.equal((await addReference(d, { pilotId: p, refType: 'pinterest', author: 'u' })).ok, false)
    assert.equal((await addReference(d, { pilotId: p, refType: 'figma_moodboard', author: 'u' })).ok, false)
    assert.equal((await addReference(d, { pilotId: p, refType: 'styleframe_direction', label: 'A', author: 'u' })).ok, true)
  })
})

describe('recordEvidence', () => {
  it('requires metric_key + value for measurements', async () => {
    const d = deps()
    const p = await newPilot(d)
    assert.equal((await recordEvidence(d, { pilotId: p, category: 'measurement', author: 'u', valueNumeric: 1 })).ok, false)
    assert.equal((await recordEvidence(d, { pilotId: p, category: 'measurement', metricKey: 'time', author: 'u' })).ok, false)
    assert.equal((await recordEvidence(d, { pilotId: p, category: 'measurement', metricKey: 'time', valueNumeric: 3, unit: 'h', author: 'u' })).ok, true)
  })

  it('accepts free-form subjective categories as append rows', async () => {
    const d = deps()
    const p = await newPilot(d)
    assert.equal((await recordEvidence(d, { pilotId: p, category: 'judgment', valueText: 'feels original', author: 'u' })).ok, true)
    assert.equal(d.store.evidence.length, 1)
  })
})

describe('decideGenerationAcceptance', () => {
  it('nothing is accepted by default; acceptance is attributed to the human', async () => {
    const d = deps()
    const p = await newPilot(d)
    const g = await recordGeneration(d, { pilotId: p, externalRef: 'x', author: 'u' })
    assert.ok(g.ok)
    const gid = (g as { ok: true; value: { id: string; acceptance: string } }).value
    assert.equal(gid.acceptance, 'pending')
    const res = await decideGenerationAcceptance(d, { generationId: gid.id, accept: true, actingUserId: 'U9', workspaceId: 'ws' })
    assert.equal(res.ok, true)
    const stored = d.store.generations.find((x) => x.id === gid.id)!
    assert.equal(stored.acceptance, 'accepted')
    assert.equal(stored.accepted_by, 'U9')
    assert.equal(stored.accepted_at, '2026-02-02T00:00:00.000Z')
  })

  it('rejects acceptance from a different workspace (never trusts visibility)', async () => {
    const d = deps()
    const p = await newPilot(d)
    const g = await recordGeneration(d, { pilotId: p, externalRef: 'x', author: 'u' })
    const gid = (g as { ok: true; value: { id: string } }).value.id
    const res = await decideGenerationAcceptance(d, { generationId: gid, accept: true, actingUserId: 'U9', workspaceId: 'evil' })
    assert.equal(res.ok, false)
    assert.match(res.ok === false ? res.reason : '', /unauthorized/)
  })
})

describe('recordMaterialMap / recordValidation', () => {
  it('material map requires a non-empty purpose', async () => {
    const d = deps()
    const p = await newPilot(d)
    assert.equal((await recordMaterialMap(d, { pilotId: p, packageName: 'pkg', mapType: 'albedo', purpose: '  ', author: 'u' })).ok, false)
    assert.equal((await recordMaterialMap(d, { pilotId: p, packageName: 'pkg', mapType: 'albedo', purpose: 'base color', author: 'u' })).ok, true)
  })

  it('validation requires a recorded evidence reference', async () => {
    const d = deps()
    const p = await newPilot(d)
    assert.equal((await recordValidation(d, { pilotId: p, tool: 'redshift', evidenceRef: '', passed: true, author: 'u' })).ok, false)
    assert.equal((await recordValidation(d, { pilotId: p, tool: 'redshift', evidenceRef: 'render.png', passed: true, author: 'u' })).ok, true)
  })
})

describe('finalizeRecommendation', () => {
  it('is blocked while evidence is incomplete', async () => {
    const d = deps()
    const p = await newPilot(d)
    const res = await finalizeRecommendation(d, { pilotId: p, recommendation: 'adopt', rationale: null, actingUserId: 'u', workspaceId: 'ws' })
    assert.equal(res.ok, false)
    assert.equal(res.ok === false && res.reason, 'finalize_blocked')
    // The pilot stays active — no partial/false finalization.
    assert.equal(d.store.pilots[0].status, 'active')
  })
})
