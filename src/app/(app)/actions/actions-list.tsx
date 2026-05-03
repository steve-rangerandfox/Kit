'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { approveAction, dismissAction } from './actions'
import { Clock } from 'lucide-react'

interface Action {
  id: string
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  type: 'budget_alert' | 'schedule_alert' | 'feedback_triage' | 'scope_alert' | 'client_email' | 'daily_briefing' | 'status_update'
  projectName: string
  projectId: string
  createdAt: string
  metadata?: Record<string, any>
}

interface ActionsListProps {
  actions: Action[]
}

const priorityColors = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#6366F1',
  low: '#6B7280',
}

const typeLabels: Record<string, string> = {
  budget_alert: 'Budget Alert',
  schedule_alert: 'Schedule Alert',
  feedback_triage: 'Feedback',
  scope_alert: 'Scope Alert',
  client_email: 'Client Email',
  daily_briefing: 'Briefing',
  status_update: 'Status Update',
}

const typeBadgeVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  budget_alert: 'danger',
  schedule_alert: 'warning',
  feedback_triage: 'info',
  scope_alert: 'danger',
  client_email: 'info',
  daily_briefing: 'info',
  status_update: 'success',
}

function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

export function ActionsListClient({ actions: initialActions }: ActionsListProps) {
  const [actions, setActions] = useState(initialActions)
  const [filterPriority, setFilterPriority] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [isPending, startTransition] = useTransition()

  const filteredActions = actions.filter((action) => {
    const priorityMatch = filterPriority === 'all' || action.priority === filterPriority
    const typeMatch = filterType === 'all' || action.type === filterType
    return priorityMatch && typeMatch
  })

  const handleApprove = (actionId: string) => {
    startTransition(async () => {
      await approveAction(actionId)
      setActions(actions.filter((a) => a.id !== actionId))
    })
  }

  const handleDismiss = (actionId: string) => {
    startTransition(async () => {
      await dismissAction(actionId)
      setActions(actions.filter((a) => a.id !== actionId))
    })
  }

  const allTypes = Array.from(new Set(initialActions.map((a) => a.type)))

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          {/* Priority Filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-[#9ca3af] font-medium">Priority:</span>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map((priority) => (
                <button
                  key={priority}
                  onClick={() => setFilterPriority(priority)}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    filterPriority === priority
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#1f2332] text-[#9ca3af] hover:bg-[#252d3d] border border-[#2a2f3d]'
                  }`}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-[#9ca3af] font-medium">Type:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  filterType === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#1f2332] text-[#9ca3af] hover:bg-[#252d3d] border border-[#2a2f3d]'
                }`}
              >
                All
              </button>
              {allTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    filterType === type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#1f2332] text-[#9ca3af] hover:bg-[#252d3d] border border-[#2a2f3d]'
                  }`}
                >
                  {typeLabels[type]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Count Badge */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-sm text-[#9ca3af]">
            {filteredActions.length} {filteredActions.length === 1 ? 'action' : 'actions'}
          </span>
          <span className="text-xs text-[#6B7280]">({actions.length} total)</span>
        </div>
      </div>

      {/* Actions List */}
      {filteredActions.length === 0 && actions.length === 0 ? (
        <div className="bg-[#181B24] border border-[#2a2f3d] rounded-lg p-12 text-center">
          <p className="text-[#9ca3af] text-lg">All clear! Kit has no pending actions.</p>
          <p className="text-[#6B7280] text-sm mt-2">You're all set for now.</p>
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="bg-[#181B24] border border-[#2a2f3d] rounded-lg p-12 text-center">
          <p className="text-[#9ca3af] text-lg">No actions match your filters.</p>
          <p className="text-[#6B7280] text-sm mt-2">Try adjusting your filters to see more actions.</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filteredActions.map((action) => (
              <motion.div
                key={action.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 400 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  interactive
                  className="overflow-hidden hover:border-[#3a3f4d] transition-colors"
                  style={{
                    borderLeft: `4px solid ${priorityColors[action.priority]}`,
                  }}
                >
                  <div className="p-5">
                    <div className="space-y-3">
                      {/* Header with type badge */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant={typeBadgeVariants[action.type]} size="sm">
                              {typeLabels[action.type]}
                            </Badge>
                            <span className="text-xs text-[#6B7280] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(action.createdAt)}
                            </span>
                          </div>
                          <h3 className="text-white font-semibold text-base break-words">{action.title}</h3>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[#9ca3af] text-sm leading-relaxed">{action.description}</p>

                      {/* Project name and metadata */}
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#6B7280]">Project:</span>
                          <a
                            href="#"
                            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                          >
                            {action.projectName}
                          </a>
                        </div>

                        {/* Actions buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleApprove(action.id)}
                            disabled={isPending}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDismiss(action.id)}
                            disabled={isPending}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}

