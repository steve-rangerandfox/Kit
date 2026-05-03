'use client'
import { useState } from 'react'

export default function NotificationsSettingsPage() {
  const [channels, setChannels] = useState({ slack: true, email: true, inApp: true })
  const [quietStart, setQuietStart] = useState('22:00')
  const [quietEnd, setQuietEnd] = useState('08:00')
  const [types, setTypes] = useState({ budget: true, schedule: true, feedback: true, briefings: true, actions: true })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange} role="switch" aria-checked={checked} className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-[#6366F1]' : 'bg-[#2a2f3d]'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Notifications</h2>
        <p className="text-sm text-[#9ca3af] mt-1">Control how Kit reaches you</p>
      </div>
      <div className="bg-[#181B24] rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-medium text-white mb-2">Channels</h3>
        {[['Slack DM', 'slack' as const], ['Email', 'email' as const], ['In-App', 'inApp' as const]].map(([label, key]) => (
          <div key={key} className="flex items-center justify-between py-1">
            <span className="text-sm text-[#9ca3af]">{label}</span>
            <Toggle checked={channels[key as keyof typeof channels]} onChange={() => setChannels(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))} />
          </div>
        ))}
      </div>
      <div className="bg-[#181B24] rounded-xl p-6 space-y-3">
        <h3 className="text-sm font-medium text-white mb-2">Quiet Hours</h3>
        <div className="flex items-center gap-3">
          <input type="time" value={quietStart} onChange={e => setQuietStart(e.target.value)} className="bg-[#0C0E12] border border-[#2a2f3d] rounded-lg px-3 py-2 text-white text-sm focus:border-[#6366F1] focus:outline-none" />
          <span className="text-[#9ca3af] text-sm">to</span>
          <input type="time" value={quietEnd} onChange={e => setQuietEnd(e.target.value)} className="bg-[#0C0E12] border border-[#2a2f3d] rounded-lg px-3 py-2 text-white text-sm focus:border-[#6366F1] focus:outline-none" />
        </div>
      </div>
      <div className="bg-[#181B24] rounded-xl p-6 space-y-3">
        <h3 className="text-sm font-medium text-white mb-2">Notification Types</h3>
        {[['Budget Alerts', 'budget' as const], ['Schedule Alerts', 'schedule' as const], ['Feedback', 'feedback' as const], ['Daily Briefings', 'briefings' as const], ['Action Items', 'actions' as const]].map(([label, key]) => (
          <div key={key} className="flex items-center justify-between py-1">
            <span className="text-sm text-[#9ca3af]">{label}</span>
            <Toggle checked={types[key as keyof typeof types]} onChange={() => setTypes(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-lg text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
        {saved && <span className="text-sm text-[#10B981]">Saved!</span>}
      </div>
    </div>
  )
}
