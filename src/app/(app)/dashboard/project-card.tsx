'use client'

import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface ProjectCardProps {
  id: string
  name: string
  clientName: string
  status: 'in_progress' | 'planning' | 'in_review' | 'completed' | 'on_hold'
  budget: number
  spent: number
  health: 'emerald' | 'amber' | 'coral'
  nextMilestone: {
    name: string
    dueDate: Date
  }
}

export function ProjectCard({
  id,
  name,
  clientName,
  status,
  budget,
  spent,
  health,
  nextMilestone,
}: ProjectCardProps) {
  const percentage = Math.round((spent / budget) * 100)

  const healthColors = {
    emerald: '#10B981',
    amber: '#F59E0B',
    coral: '#EF4444',
  }

  const statusLabels = {
    in_progress: 'In Progress',
    planning: 'Planning',
    in_review: 'In Review',
    completed: 'Completed',
    on_hold: 'On Hold',
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Link href={`/projects/${id}`}>
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="kit-card-interactive h-full space-y-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <h3 className="text-base font-semibold text-white">{name}</h3>
            <p className="text-sm text-[#b4b8c3]">{clientName}</p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: healthColors[health] }}
            />
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6b7280]">Budget Progress</span>
            <span className="text-xs font-mono text-[#b4b8c3]">{percentage}%</span>
          </div>
          <div className="w-full h-2 bg-[#0C0E12] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentage, 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                backgroundColor:
                  percentage > 90
                    ? healthColors.coral
                    : percentage > 75
                      ? healthColors.amber
                      : healthColors.emerald,
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6b7280]">
              {formatCurrency(spent)} of {formatCurrency(budget)}
            </span>
          </div>
        </div>

        {/* Milestone */}
        <div className="space-y-2">
          <p className="text-xs text-[#6b7280]">Next Milestone</p>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-white">{nextMilestone.name}</p>
            <span className="text-xs text-[#b4b8c3] whitespace-nowrap">
              {formatDate(nextMilestone.dueDate)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#2a2f3d]">
          <div className="inline-block">
            <span
              className="text-xs font-medium px-2 py-1 rounded-md"
              style={{
                backgroundColor: healthColors[health] + '20',
                color: healthColors[health],
              }}
            >
              {statusLabels[status]}
            </span>
          </div>
          <ChevronRight
            size={16}
            className="text-[#6b7280] transition-transform group-hover:translate-x-1"
          />
        </div>
      </motion.div>
    </Link>
  )
}
