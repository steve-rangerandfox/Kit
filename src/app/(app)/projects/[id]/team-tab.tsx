'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, Plus, X } from 'lucide-react'
import { useState } from 'react'

interface Project {
  team_members: Array<{
    id: string
    name: string
    role: string
    email: string
    avatar: string
  }>
}

export function TeamTab({ project }: { project: Project }) {
  const [teamMembers, setTeamMembers] = useState(project.team_members)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  const handleRemoveMember = (memberId: string) => {
    setTeamMembers(teamMembers.filter((m) => m.id !== memberId))
  }

  const roleColors = {
    'Motion Designer': 'info',
    'Producer': 'success',
    'Editor': 'warning',
    'VFX Artist': 'danger',
    'Sound Designer': 'info',
    'Animator': 'info',
    'Compositor': 'warning',
    'Color Grader': 'warning',
    'Director': 'success',
  }

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Team Members</h2>
        <Button
          size="sm"
          variant="primary"
          className="gap-2"
          onClick={() => setIsAddingMember(!isAddingMember)}
        >
          <Plus className="w-4 h-4" />
          Add Member
        </Button>
      </div>

      {/* Add Member Form */}
      {isAddingMember && (
        <Card className="kit-card border border-indigo-500/30">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Select Team Member</label>
                <select className="w-full bg-[#181B24] border border-[#2a2f3d] rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors">
                  <option value="">Choose a team member...</option>
                  <option>Sarah Johnson (Director)</option>
                  <option>Michael Chen (VFX Artist)</option>
                  <option>Emma Davis (Sound Designer)</option>
                  <option>Robert Wilson (Compositor)</option>
                </select>
              </div>
              <p className="text-xs text-[#9ca3af]">
                Can't find who you're looking for? Invite them to the workspace first.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="primary">
                  Add to Team
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsAddingMember(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMembers.map((member) => {
          const roleColor =
            roleColors[member.role as keyof typeof roleColors] || 'default'

          return (
            <Card
              key={member.id}
              className="kit-card hover:border-[#3a3f4d] transition-colors group"
            >
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Avatar and Name */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xl flex-shrink-0">
                      {member.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{member.name}</h3>
                      <Badge
                        variant={roleColor as 'default' | 'success' | 'warning' | 'danger' | 'info'}
                        size="sm"
                        className="mt-2"
                      >
                        {member.role}
                      </Badge>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="pt-3 border-t border-[#2a2f3d]">
                    <a
                      href={`mailto:${member.email}`}
                      className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors group/link"
                    >
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{member.email}</span>
                    </a>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="flex-1">
                      Message
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="kit-card">
          <CardContent className="pt-6">
            <p className="text-xs text-[#9ca3af] mb-2">Total Team Members</p>
            <p className="text-3xl font-bold text-white">{teamMembers.length}</p>
          </CardContent>
        </Card>

        <Card className="kit-card">
          <CardContent className="pt-6">
            <p className="text-xs text-[#9ca3af] mb-2">Departments</p>
            <p className="text-lg font-semibold text-white">
              {new Set(teamMembers.map((m) => m.role)).size}
            </p>
            <p className="text-xs text-[#6b7280] mt-2">
              {Array.from(new Set(teamMembers.map((m) => m.role))).join(', ')}
            </p>
          </CardContent>
        </Card>

        <Card className="kit-card">
          <CardContent className="pt-6">
            <p className="text-xs text-[#9ca3af] mb-2">Team Lead</p>
            <p className="text-white font-semibold">{teamMembers[0]?.name || 'Unassigned'}</p>
            <p className="text-xs text-[#6b7280] mt-2">{teamMembers[0]?.role}</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Availability */}
      <Card className="kit-card">
        <CardHeader>
          <CardTitle>Team Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.map((member) => {
              const availabilityPercentage = [85, 75, 90, 70][Math.floor(Math.random() * 4)]
              return (
                <div key={member.id}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-white">{member.name}</span>
                    <span className="text-sm font-mono text-indigo-400">{availabilityPercentage}%</span>
                  </div>
                  <div className="w-full bg-[#181B24] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        availabilityPercentage > 80
                          ? 'bg-emerald-500'
                          : availabilityPercentage > 60
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${availabilityPercentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Collaboration Settings */}
      <Card className="kit-card">
        <CardHeader>
          <CardTitle>Collaboration Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white">Daily Stand-ups</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
            </div>
            <p className="text-xs text-[#9ca3af]">
              Enable daily standup reminders for all team members
            </p>
          </div>

          <div className="border-t border-[#2a2f3d] pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white">Slack Notifications</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
            </div>
            <p className="text-xs text-[#9ca3af]">
              Post project updates to #nike-summer channel
            </p>
          </div>

          <div className="border-t border-[#2a2f3d] pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white">Time Zone Awareness</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
            </div>
            <p className="text-xs text-[#9ca3af]">
              Account for time zone differences when scheduling
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
