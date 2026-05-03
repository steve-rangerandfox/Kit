'use client'

import { motion } from 'framer-motion'
import { Zap, Clock, Gauge, CheckSquare } from 'lucide-react'

interface StatsStripProps {
  activeProjects: number
  pendingActions: number
  hoursThisWeek: number
  studioHealth: number
}

export function StatsStrip({
  activeProjects,
  pendingActions,
  hoursThisWeek,
  studioHealth,
}: StatsStripProps) {
  const stats = [
    {
      icon: Zap,
      label: 'Active Projects',
      value: activeProjects,
      color: '#6366F1',
    },
    {
      icon: CheckSquare,
      label: 'Pending Actions',
      value: pendingActions,
      color: '#F59E0B',
    },
    {
      icon: Clock,
      label: 'Hours This Week',
      value: hoursThisWeek,
      color: '#3B82F6',
      suffix: 'h',
    },
    {
      icon: Gauge,
      label: 'Studio Health',
      value: studioHealth,
      color: '#10B981',
      suffix: '%',
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' as const },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={index}
            variants={itemVariants}
            className="kit-card space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#b4b8c3]">{stat.label}</p>
              <Icon
                size={18}
                className="text-[#6b7280]"
                style={{ color: stat.color }}
              />
            </div>
            <div className="space-y-1">
              <div className="font-mono text-3xl font-semibold text-white">
                {stat.value}
                {stat.suffix && <span className="text-xl ml-1">{stat.suffix}</span>}
              </div>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
