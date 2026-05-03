'use client'
import { useState } from 'react'

export default function WorkspaceSettingsPage() {
  const [name, setName] = useState('Ranger & Fox')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

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
        <h2 className="text-xl font-semibold text-white">Workspace Settings</h2>
        <p className="text-sm text-[#9ca3af] mt-1">Manage your workspace configuration</p>
      </div>
      <div className="bg-[#181B24] rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#9ca3af] mb-1">Workspace Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#0C0E12] border border-[#2a2f3d] rounded-lg px-3 py-2 text-white focus:border-[#6366F1] focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#9ca3af] mb-1">Slug</label>
          <div className="px-3 py-2 bg-[#0C0E12] border border-[#2a2f3d] rounded-lg text-[#9ca3af] font-mono text-sm">{slug}</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm text-[#10B981]">Saved\!</span>}
        </div>
      </div>
    </div>
  )
}
