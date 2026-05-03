'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  BarChart3,
  Calendar,
  MessageSquare,
  Zap,
  Phone,
  Package,
  BookOpen,
  Wrench,
  Users,
  Layout,
} from 'lucide-react'

interface TabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: Layout },
  { id: 'budget', label: 'Budget', icon: BarChart3 },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'comms', label: 'Comms', icon: Phone },
  { id: 'deliverables', label: 'Deliverables', icon: Package },
  { id: 'context', label: 'Context', icon: BookOpen },
  { id: 'toolkit', label: 'Toolkit', icon: Wrench },
  { id: 'team', label: 'Team', icon: Users },
]

export function Tabs({ activeTab, onTabChange }: TabsProps) {
  const pathname = usePathname()
  const projectId = pathname.split('/')[3]

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-8 pb-4 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <Link
              key={tab.id}
              href={`/projects/${projectId}?tab=${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-[#9ca3af] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
