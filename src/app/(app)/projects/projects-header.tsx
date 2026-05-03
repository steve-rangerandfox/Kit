'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { CreateProjectDialog } from './create-project-dialog'

export function ProjectsHeader({ existingClients, projectCount }: { existingClients: string[]; projectCount: number }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">Projects</h1>
          <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-[#2a2f3d] text-[#9ca3af]">{projectCount}</span>
        </div>
        <p className="text-sm text-[#9ca3af] mt-1">Manage your studio&apos;s production work</p>
      </div>
      <button
        onClick={() => setIsDialogOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#5558E6] text-white font-medium text-sm transition-colors"
      >
        <Plus size={16} />
        New Project
      </button>
      <CreateProjectDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} existingClients={existingClients} />
    </div>
  )
}
