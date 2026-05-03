'use client'
import { useState } from 'react'

export default function DefaultsSettingsPage() {
  const [margin, setMargin] = useState(30)
  const [threshold, setThreshold] = useState(80)
  const [rounds, setRounds] = useState(2)
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
        <h2 className="text-xl font-semibold text-white">Defaults</h2>
        <p className="text-sm text-[#9ca3af] mt-1">Set default values for new projects</p>
      </div>
      <div className="bg-[#181B24] rounded-xl p-6 space-y-6">
        <div>
          <label className="flex justify-between text-sm text-[#9ca3af] mb-2">
            <span>Margin Target</span><span className="font-mono text-white">{margin}%</span>
          </label>
          <input type="range" min={0} max={100} value={margin} onChange={e => setMargin(Number(e.target.value))} className="w-full accent-[#6366F1]" />
        </div>
        <div>
          <label className="flex justify-between text-sm text-[#9ca3af] mb-2">
            <span>Budget Alert Threshold</span><span className="font-mono text-white">{threshold}%</span>
          </label>
          <input type="range" min={0} max={100} value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="w-full accent-[#6366F1]" />
        </div>
        <div>
          <label className="block text-sm text-[#9ca3af] mb-2">Default Revision Rounds</label>
          <input type="number" min={1} max={20} value={rounds} onChange={e => setRounds(Number(e.target.value))} className="w-20 bg-[#0C0E12] border border-[#2a2f3d] rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-[#6366F1] focus:outline-none" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Defaults'}
          </button>
          {saved && <span className="text-sm text-[#10B981]">Saved\!</span>}
        </div>
      </div>
    </div>
  )
}
