'use client'
import { useState } from 'react'

const mockMembers = [
  { id: '1', name: 'Stephen Fox', email: 'steve@rangerandfox.tv', role: 'founder', joined: '2024-01-15' },
  { id: '2', name: 'Sarah Chen', email: 'sarah@rangerandfox.tv', role: 'producer', joined: '2024-03-01' },
  { id: '3', name: 'Mike Torres', email: 'mike@rangerandfox.tv', role: 'artist', joined: '2024-06-10' },
  { id: '4', name: 'Emily Park', email: 'emily@rangerandfox.tv', role: 'artist', joined: '2024-08-22' },
  { id: '5', name: 'Jake Wilson', email: 'jake@freelance.com', role: 'freelancer', joined: '2025-01-05' },
]

const roleColors: Record<string, string> = {
  founder: 'bg-[#6366F1]/20 text-[#6366F1]',
  producer: 'bg-[#10B981]/20 text-[#10B981]',
  artist: 'bg-[#F59E0B]/20 text-[#F59E0B]',
  freelancer: 'bg-[#9ca3af]/20 text-[#9ca3af]',
}

export default function TeamSettingsPage() {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('artist')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Team</h2>
        <p className="text-sm text-[#9ca3af] mt-1">Manage team members and roles</p>
      </div>
      <div className="bg-[#181B24] rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-medium text-white">Invite Member</h3>
        <div className="flex gap-3">
          <input type="email" placeholder="email@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="flex-1 bg-[#0C0E12] border border-[#2a2f3d] rounded-lg px-3 py-2 text-white text-sm focus:border-[#6366F1] focus:outline-none" />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="bg-[#0C0E12] border border-[#2a2f3d] rounded-lg px-3 py-2 text-white text-sm focus:border-[#6366F1] focus:outline-none">
            <option value="producer">Producer</option>
            <option value="artist">Artist</option>
            <option value="freelancer">Freelancer</option>
          </select>
          <button className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-lg text-sm font-medium">Invite</button>
        </div>
      </div>
      <div className="bg-[#181B24] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-[#2a2f3d]">
            <th className="text-left text-xs font-medium text-[#9ca3af] px-6 py-3">Member</th>
            <th className="text-left text-xs font-medium text-[#9ca3af] px-6 py-3">Role</th>
            <th className="text-left text-xs font-medium text-[#9ca3af] px-6 py-3">Joined</th>
          </tr></thead>
          <tbody>
            {mockMembers.map(m => (
              <tr key={m.id} className="border-b border-[#2a2f3d]/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#6366F1] flex items-center justify-center text-xs text-white font-medium">{m.name.split(' ').map(n=>n[0]).join('')}</div>
                    <div><div className="text-sm text-white">{m.name}</div><div className="text-xs text-[#9ca3af]">{m.email}</div></div>
                  </div>
                </td>
                <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-xs font-medium ${roleColors[m.role]}`}>{m.role}</span></td>
                <td className="px-6 py-4 text-sm text-[#9ca3af]">{m.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
