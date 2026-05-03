'use client'
import { useState } from 'react'

function getSample(formality: number, playfulness: number) {
  const f = formality > 60 ? 'formal' : formality > 30 ? 'balanced' : 'casual'
  const p = playfulness > 60 ? 'playful' : playfulness > 30 ? 'neutral' : 'dry'
  const samples: Record<string, Record<string, string>> = {
    formal: {
      playful: 'Good morning\! Your studio is humming along nicely today. Three projects on track, one needs a gentle nudge.',
      neutral: 'Good morning. Three projects are on track. The Nike campaign requires attention regarding budget.',
      dry: 'Morning report: 3 projects on schedule. Nike campaign budget variance detected. Action recommended.',
    },
    balanced: {
      playful: 'Hey\! Pretty solid day ahead. Nike needs a budget check, but everything else is looking good.',
      neutral: 'Good morning. Here is your daily update. Nike budget needs review. Other projects are on track.',
      dry: 'Daily update: Nike budget review needed. Remaining projects progressing normally.',
    },
    casual: {
      playful: 'Morning\! Quick heads up - Nike budget is getting spicy, but the rest of the crew is crushing it.',
      neutral: 'Hey there. Nike budget needs a look. Everything else is solid.',
      dry: 'Nike budget needs attention. Other projects fine.',
    },
  }
  return samples[f]?.[p] || samples.balanced.neutral
}

export default function PersonalitySettingsPage() {
  const [formality, setFormality] = useState(50)
  const [playfulness, setPlayfulness] = useState(50)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Personality</h2>
        <p className="text-sm text-[#9ca3af] mt-1">Tune how Kit communicates with your team</p>
      </div>
      <div className="bg-[#181B24] rounded-xl p-6 space-y-6">
        <div>
          <label className="flex justify-between text-sm text-[#9ca3af] mb-2">
            <span>Casual</span><span className="font-mono text-white">{formality}</span><span>Formal</span>
          </label>
          <input type="range" min={0} max={100} value={formality} onChange={e => setFormality(Number(e.target.value))} className="w-full accent-[#6366F1]" />
        </div>
        <div>
          <label className="flex justify-between text-sm text-[#9ca3af] mb-2">
            <span>Straightforward</span><span className="font-mono text-white">{playfulness}</span><span>Playful</span>
          </label>
          <input type="range" min={0} max={100} value={playfulness} onChange={e => setPlayfulness(Number(e.target.value))} className="w-full accent-[#6366F1]" />
        </div>
      </div>
      <div className="bg-[#181B24] rounded-xl p-6">
        <h3 className="text-sm font-medium text-[#9ca3af] mb-3">Live Preview — Daily Briefing</h3>
        <div className="bg-[#0C0E12] rounded-lg p-4 text-sm text-white leading-relaxed">{getSample(formality, playfulness)}</div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-lg text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Personality'}
        </button>
        {saved && <span className="text-sm text-[#10B981]">Saved\!</span>}
      </div>
    </div>
  )
}
