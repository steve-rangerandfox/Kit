'use client'

import { motion } from 'framer-motion'
import { ProjectCard } from './project-card'
import Link from 'next/link'
import { Plus } from 'lucide-react'

interface Project {
  id: string
  name: string
  client_name: string
  status: 'in_progress' | 'planning' | 'in_review' | 'completed' | 'on_hold'
  budget: number
  spent: number
  health: 'emerald' | 'amber' | 'coral'
  nextMilestone: {
    name: string
    dueDate: Date
  }
}

interface ProjectGridProps {
  projects: Project[]
}

export function ProjectGrid({ projects }: ProjectGridProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.3,
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

  if (!projects || projects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="kit-card py-16 px-8 text-center space-y-4"
      >
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-white">No active projects yet</h3>
          <p className="text-[#b4b8c3]">
            Get started by creating your first project to begin tracking production.
          </p>
        </div>
        <Link href="/projects/new">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium transition-colors">
            <Plus size={18} />
            Create Project
          </button>
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Active Projects</h2>
        <Link href="/projects">
          <button className="text-sm text-[#6366F1] hover:text-[#4F46E5] font-medium transition-colors">
            View All
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <motion.div key={project.id} variants={itemVariants}>
            <ProjectCard
              id={project.id}
              name={project.name}
              clientName={project.client_name}
              status={project.status}
              budget={project.budget}
              spent={project.spent}
              health={project.health}
              nextMilestone={project.nextMilestone}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
