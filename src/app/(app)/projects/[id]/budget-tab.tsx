'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Project {
  burn_rate: Array<{ week: string; amount: number }>
  margin_target: number
  margin_actual: number
  time_by_member: Array<{ name: string; hours: number; percentage: number }>
  time_by_category: Array<{ category: string; hours: number; percentage: number }>
  time_entries: Array<{
    id: string
    date: Date
    member: string
    hours: number
    category: string
    description: string
  }>
}

export function BudgetTab({ project }: { project: Project }) {
  const maxBurnRate = Math.max(...project.burn_rate.map((b) => b.amount))
  const marginDiff = project.margin_target - project.margin_actual

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      {/* Burn Rate Chart */}
      <Card className="kit-card">
        <CardHeader>
          <CardTitle>Burn Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {project.burn_rate.map((week) => {
              const percentage = (week.amount / maxBurnRate) * 100
              return (
                <div key={week.week}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-white font-medium">{week.week}</span>
                    <span className="text-sm font-mono text-indigo-400">
                      ${week.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-[#181B24] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Margin Tracker */}
        <Card className="kit-card">
          <CardHeader>
            <CardTitle>Margin Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm text-white">Target Margin</span>
                  <span className="text-lg font-mono text-emerald-400">
                    ${project.margin_target.toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm text-white">Actual Margin</span>
                  <span
                    className={`text-lg font-mono ${
                      marginDiff >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    ${project.margin_actual.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#2a2f3d]">
                <div className="flex justify-between items-end">
                  <span className="text-sm text-[#9ca3af]">Difference</span>
                  <span
                    className={`text-sm font-mono font-semibold ${
                      marginDiff >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {marginDiff >= 0 ? '+' : ''}${marginDiff.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-[#6b7280] mt-2">
                  {marginDiff >= 0
                    ? 'On track - exceeding margin target'
                    : `${Math.abs(marginDiff).toLocaleString()} below target margin`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time by Team Member */}
        <Card className="kit-card">
          <CardHeader>
            <CardTitle>Time by Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {project.time_by_member.map((member) => (
                <div key={member.name}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-white">{member.name}</span>
                    <span className="text-sm font-mono text-indigo-400">{member.hours}h</span>
                  </div>
                  <div className="w-full bg-[#181B24] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all"
                      style={{ width: `${member.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time by Category */}
      <Card className="kit-card">
        <CardHeader>
          <CardTitle>Time by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {project.time_by_category.map((item) => (
                <div key={item.category}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-white">{item.category}</span>
                    <span className="text-sm font-mono text-indigo-400">{item.hours}h</span>
                  </div>
                  <div className="w-full bg-[#181B24] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Pie-like visual representation */}
            <div className="flex items-center justify-center">
              <div className="w-40 h-40 relative">
                <div className="absolute inset-0 rounded-full border-8 border-[#181B24]" />
                {project.time_by_category.map((item, index) => {
                  const colors = [
                    'bg-indigo-500',
                    'bg-indigo-600',
                    'bg-indigo-400',
                    'bg-indigo-700',
                    'bg-indigo-300',
                  ]
                  const angle = project.time_by_category
                    .slice(0, index)
                    .reduce((sum, i) => sum + i.percentage, 0)

                  return (
                    <div
                      key={item.category}
                      className={`absolute inset-0 rounded-full ${colors[index % colors.length]}`}
                      style={{
                        clipPath: `conic-gradient(from ${angle}deg, transparent 0deg ${item.percentage * 3.6}deg, transparent ${item.percentage * 3.6}deg)`,
                        opacity: 0.3,
                      }}
                    />
                  )
                })}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-[#9ca3af]">Total</p>
                    <p className="text-lg font-mono text-white font-semibold">
                      {project.time_by_category.reduce((sum, i) => sum + i.hours, 0)}h
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries Table */}
      <Card className="kit-card">
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2f3d]">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#9ca3af]">Date</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#9ca3af]">Member</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#9ca3af]">Hours</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#9ca3af]">Category</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#9ca3af]">Description</th>
                </tr>
              </thead>
              <tbody>
                {project.time_entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[#2a2f3d] hover:bg-[#181B24] transition-colors">
                    <td className="py-3 px-3 text-white font-mono text-xs">
                      {entry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 px-3 text-white">{entry.member}</td>
                    <td className="py-3 px-3 text-indigo-400 font-mono">{entry.hours}h</td>
                    <td className="py-3 px-3 text-[#9ca3af] text-xs">{entry.category}</td>
                    <td className="py-3 px-3 text-[#9ca3af]">{entry.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
