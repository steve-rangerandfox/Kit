'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type PitchStatus = 'won' | 'lost' | 'pending'

interface Pitch {
  id: string
  clientName: string
  projectName: string
  status: PitchStatus
  value: number
  submittedDate: string
  decidedDate?: string
  notes: string
}

const mockPitches: Pitch[] = [
  {
    id: '1',
    clientName: 'Netflix Originals',
    projectName: 'Stranger Things Season 6 VFX',
    status: 'won',
    value: 185000,
    submittedDate: '2026-03-15',
    decidedDate: '2026-03-28',
    notes: 'Strong portfolio match, tight timeline accepted',
  },
  {
    id: '2',
    clientName: 'Apple TV+',
    projectName: 'Sci-Fi Series Motion Graphics',
    status: 'pending',
    value: 120000,
    submittedDate: '2026-04-02',
    notes: 'Awaiting client decision after presentation',
  },
  {
    id: '3',
    clientName: 'Nike Global',
    projectName: 'Olympics Campaign 2024',
    status: 'won',
    value: 220000,
    submittedDate: '2026-02-10',
    decidedDate: '2026-02-24',
    notes: 'Beat 4 other studios, lowest cost proposal',
  },
  {
    id: '4',
    clientName: 'Pepsi Co',
    projectName: 'Super Bowl Commercial',
    status: 'lost',
    value: 450000,
    submittedDate: '2026-01-15',
    decidedDate: '2026-02-05',
    notes: 'Lost to larger agency with celebrity talent',
  },
  {
    id: '5',
    clientName: 'CNN International',
    projectName: 'News Graphics Package',
    status: 'won',
    value: 75000,
    submittedDate: '2026-03-20',
    decidedDate: '2026-03-25',
    notes: 'Quick turnaround, existing relationship advantage',
  },
  {
    id: '6',
    clientName: 'Spotify',
    projectName: 'Podcast Brand Package',
    status: 'won',
    value: 62000,
    submittedDate: '2026-03-10',
    decidedDate: '2026-03-18',
    notes: 'Unique creative approach resonated',
  },
  {
    id: '7',
    clientName: 'Tesla Inc',
    projectName: 'Product Launch Animation',
    status: 'lost',
    value: 320000,
    submittedDate: '2026-02-01',
    decidedDate: '2026-03-01',
    notes: 'In-house team was selected instead',
  },
  {
    id: '8',
    clientName: 'BBC Studios',
    projectName: 'Documentary Title Sequence',
    status: 'pending',
    value: 95000,
    submittedDate: '2026-03-25',
    notes: 'In final selection round with 2 competitors',
  },
  {
    id: '9',
    clientName: 'Sony Entertainment',
    projectName: 'Gaming Cinematic Trailer',
    status: 'won',
    value: 280000,
    submittedDate: '2026-01-20',
    decidedDate: '2026-02-10',
    notes: 'Previous success with similar project type',
  },
  {
    id: '10',
    clientName: 'Adobe Creative Cloud',
    projectName: 'Tutorial Video Series',
    status: 'lost',
    value: 85000,
    submittedDate: '2026-03-05',
    decidedDate: '2026-03-22',
    notes: 'Selected internal production team',
  },
  {
    id: '11',
    clientName: 'Microsoft Azure',
    projectName: 'Enterprise Solution Demo',
    status: 'pending',
    value: 140000,
    submittedDate: '2026-04-01',
    notes: 'Technical review phase underway',
  },
  {
    id: '12',
    clientName: 'Acme Corporation',
    projectName: 'Corporate Brand Video',
    status: 'won',
    value: 85000,
    submittedDate: '2026-02-28',
    decidedDate: '2026-03-14',
    notes: 'Trusted partner from previous projects',
  },
]

export function PitchTracker() {
  const [filterStatus, setFilterStatus] = useState<PitchStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date')

  const won = mockPitches.filter((p) => p.status === 'won').length
  const lost = mockPitches.filter((p) => p.status === 'lost').length
  const pending = mockPitches.filter((p) => p.status === 'pending').length
  const total = mockPitches.length
  const winRate = total > 0 ? Math.round((won / (won + lost)) * 100) : 0

  const totalWon = mockPitches
    .filter((p) => p.status === 'won')
    .reduce((sum, p) => sum + p.value, 0)

  const totalLost = mockPitches
    .filter((p) => p.status === 'lost')
    .reduce((sum, p) => sum + p.value, 0)

  let filtered = mockPitches
  if (filterStatus !== 'all') {
    filtered = filtered.filter((p) => p.status === filterStatus)
  }

  if (sortBy === 'date') {
    filtered.sort((a, b) => {
      const dateA = new Date(a.submittedDate).getTime()
      const dateB = new Date(b.submittedDate).getTime()
      return dateB - dateA
    })
  } else {
    filtered.sort((a, b) => b.value - a.value)
  }

  const getStatusBadge = (
    status: PitchStatus
  ): 'success' | 'danger' | 'warning' => {
    switch (status) {
      case 'won':
        return 'success'
      case 'lost':
        return 'danger'
      case 'pending':
        return 'warning'
    }
  }

  const getStatusLabel = (status: PitchStatus) => {
    switch (status) {
      case 'won':
        return 'Won'
      case 'lost':
        return 'Lost'
      case 'pending':
        return 'Pending'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-[#9ca3af] text-sm mb-2">Win Rate</p>
            <p className="text-3xl font-bold text-emerald-400 font-mono">{winRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-[#9ca3af] text-sm mb-2">Total Won</p>
            <p className="text-2xl font-bold text-white font-mono">{won}</p>
            <p className="text-xs text-emerald-400 font-mono mt-1">{formatCurrency(totalWon)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-[#9ca3af] text-sm mb-2">Total Lost</p>
            <p className="text-2xl font-bold text-white font-mono">{lost}</p>
            <p className="text-xs text-red-400 font-mono mt-1">{formatCurrency(totalLost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-[#9ca3af] text-sm mb-2">Pending</p>
            <p className="text-3xl font-bold text-amber-400 font-mono">{pending}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pitch Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Pitch Log</CardTitle>
              <CardDescription>All pitch submissions and outcomes</CardDescription>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as PitchStatus | 'all')}
                className="px-3 py-2 rounded bg-[#181B24] border border-[#2a2f3d] text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="pending">Pending</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'value')}
                className="px-3 py-2 rounded bg-[#181B24] border border-[#2a2f3d] text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="date">Sort by Date</option>
                <option value="value">Sort by Value</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2f3d]">
                  <th className="text-left py-3 px-4 text-[#9ca3af] font-medium">Client</th>
                  <th className="text-left py-3 px-4 text-[#9ca3af] font-medium">Project</th>
                  <th className="text-left py-3 px-4 text-[#9ca3af] font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-[#9ca3af] font-medium">Value</th>
                  <th className="text-left py-3 px-4 text-[#9ca3af] font-medium">Submitted</th>
                  <th className="text-left py-3 px-4 text-[#9ca3af] font-medium">Decided</th>
                  <th className="text-left py-3 px-4 text-[#9ca3af] font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pitch) => (
                  <tr
                    key={pitch.id}
                    className="border-b border-[#2a2f3d] hover:bg-[#181B24]/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-white font-medium">{pitch.clientName}</td>
                    <td className="py-3 px-4 text-white">{pitch.projectName}</td>
                    <td className="py-3 px-4">
                      <Badge variant={getStatusBadge(pitch.status)} size="sm">
                        {getStatusLabel(pitch.status)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-white font-mono">
                      {formatCurrency(pitch.value)}
                    </td>
                    <td className="py-3 px-4 text-[#9ca3af] text-xs">
                      {formatDate(pitch.submittedDate)}
                    </td>
                    <td className="py-3 px-4 text-[#9ca3af] text-xs">
                      {pitch.decidedDate ? formatDate(pitch.decidedDate) : '—'}
                    </td>
                    <td className="py-3 px-4 text-[#9ca3af] max-w-xs truncate">{pitch.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[#9ca3af]">No pitches found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
