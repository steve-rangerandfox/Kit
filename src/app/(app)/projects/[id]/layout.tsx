'use client'

import { useState } from 'react'
import { ProjectHeader } from './project-header'
import { Tabs } from './tabs'

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const [activeTab, setActiveTab] = useState('overview')

  // Mock project header data
  const project = {
    name: 'Nike Summer Campaign',
    client_name: 'Nike Global',
    project_code: 'NIKE-SUM-2026',
    status: 'in_progress' as const,
    health: 'amber' as const,
    budget: 150000,
    spent: 87500,
  }

  return (
    <div className="flex flex-col h-full">
      {/* Project Header */}
      <div className="border-b border-[#2a2f3d] bg-[#0C0E12]">
        <div className="px-6 md:px-8 lg:px-12 py-6 max-w-7xl mx-auto">
          <ProjectHeader project={project} />

          {/* Budget Progress Bar */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#9ca3af]">Budget</span>
              <span className="font-mono text-white">
                ${project.spent.toLocaleString()} / ${project.budget.toLocaleString()}
                <span className="text-[#9ca3af]">
                  {' '}({Math.round((project.spent / project.budget) * 100)}%)
                </span>
              </span>
            </div>
            <div className="w-full bg-[#181B24] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  (project.spent / project.budget) * 100 < 70
                    ? 'bg-emerald-500'
                    : (project.spent / project.budget) * 100 < 90
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min((project.spent / project.budget) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[#2a2f3d] bg-[#0C0E12] sticky top-0 z-10">
        <div className="px-6 md:px-8 lg:px-12 max-w-7xl mx-auto">
          <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
