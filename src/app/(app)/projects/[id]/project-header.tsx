'use client'

import { Badge } from '@/components/ui/badge'

interface ProjectHeaderProps {
  project: {
    name: string
    client_name: string
    project_code: string
    status: 'planning' | 'in_progress' | 'in_review' | 'completed' | 'on_hold' | 'cancelled'
    health: 'emerald' | 'amber' | 'coral'
    budget: number
    spent: number
  }
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const statusColors = {
    planning: 'default',
    in_progress: 'info',
    in_review: 'info',
    completed: 'success',
    on_hold: 'warning',
    cancelled: 'danger',
  }

  const statusLabels = {
    planning: 'Planning',
    in_progress: 'In Progress',
    in_review: 'In Review',
    completed: 'Completed',
    on_hold: 'On Hold',
    cancelled: 'Cancelled',
  }

  const healthDot = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    coral: 'bg-red-500',
  }

  const spentPercentage = (project.spent / project.budget) * 100

  return (
    <div className="space-y-4">
      {/* Title and Meta */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 truncate">
            {project.name}
          </h1>
          <p className="text-[#9ca3af] mb-3">{project.client_name}</p>
          <p className="text-xs font-mono text-[#6b7280] tracking-wide">
            {project.project_code}
          </p>
        </div>

        {/* Status & Health */}
        <div className="flex flex-col items-end gap-3">
          <Badge
            variant={statusColors[project.status] as 'default' | 'success' | 'warning' | 'danger' | 'info'}
            size="md"
          >
            {statusLabels[project.status]}
          </Badge>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9ca3af]">Health</span>
            <div className={`w-3 h-3 rounded-full ${healthDot[project.health]}`} />
          </div>
        </div>
      </div>
    </div>
  )
}
