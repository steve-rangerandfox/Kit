'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createProject } from './actions'
import { useRouter } from 'next/navigation'

interface CreateProjectDialogProps {
  isOpen: boolean
  onClose: () => void
  existingClients: string[]
}

const projectTypes = [
  { id: 'animation', label: 'Animation' },
  { id: 'vfx', label: 'VFX' },
  { id: 'motion-graphics', label: 'Motion Graphics' },
  { id: 'live-action', label: 'Live Action' },
  { id: 'mixed-media', label: 'Mixed Media' },
]

export function CreateProjectDialog({
  isOpen,
  onClose,
  existingClients,
}: CreateProjectDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    project_code: '',
    type: 'animation',
    start_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    budget: '',
    margin_target: '30',
    revision_rounds: '2',
    brief: '',
  })

  const [suggestions, setSuggestions] = useState<string[]>([])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData((prev) => ({ ...prev, name: value }))

    // Auto-generate project code from name
    const code = value
      .toUpperCase()
      .replace(/\s+/g, '-')
      .substring(0, 20)
    setFormData((prev) => ({ ...prev, project_code: code }))
  }

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData((prev) => ({ ...prev, client_name: value }))

    // Show suggestions if there are matching clients
    if (value.length > 0) {
      const filtered = existingClients.filter((client) =>
        client.toLowerCase().includes(value.toLowerCase())
      )
      setSuggestions(filtered)
    } else {
      setSuggestions([])
    }
  }

  const handleSelectClient = (client: string) => {
    setFormData((prev) => ({ ...prev, client_name: client }))
    setSuggestions([])
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await createProject({
        name: formData.name,
        client_name: formData.client_name,
        project_code: formData.project_code,
        type: formData.type,
        start_date: formData.start_date,
        due_date: formData.due_date,
        budget: parseFloat(formData.budget) || 0,
        margin_target: parseFloat(formData.margin_target),
        revision_rounds: parseInt(formData.revision_rounds),
        brief: formData.brief,
      })

      if (result.success) {
        onClose()
        // Redirect to project detail page
        router.push(`/projects/${result.projectId}`)
      }
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Failed to create project. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl"
          >
            <div className="bg-[#181B24] border border-[#2a2f3d] rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-[#181B24] border-b border-[#2a2f3d] p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Create New Project</h2>
                  <p className="text-sm text-[#9ca3af] mt-1">
                    Set up a new production project
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-[#2a2f3d] rounded-lg transition-colors"
                >
                  <X size={20} className="text-[#9ca3af]" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Project Name */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Project Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="e.g., Nike Summer Campaign"
                    required
                  />
                </div>

                {/* Client Name with Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-white mb-2">
                    Client Name
                  </label>
                  <Input
                    type="text"
                    value={formData.client_name}
                    onChange={handleClientChange}
                    placeholder="e.g., Nike Global"
                  />
                  {suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-[#1f2332] border border-[#2a2f3d] rounded-lg shadow-lg z-10"
                    >
                      {suggestions.map((client, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectClient(client)}
                          className="w-full text-left px-4 py-2 hover:bg-[#2a2f3d] text-white text-sm first:rounded-t-lg last:rounded-b-lg transition-colors"
                        >
                          {client}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Project Code */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Project Code *
                  </label>
                  <Input
                    type="text"
                    name="project_code"
                    value={formData.project_code}
                    onChange={handleChange}
                    placeholder="Auto-generated from project name"
                  />
                  <p className="text-xs text-[#6b7280] mt-1">
                    Auto-generated from project name, editable
                  </p>
                </div>

                {/* Project Type */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Project Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded border bg-[#0C0E12] border-[#2a2f3d] text-white transition-colors duration-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    {projectTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dates Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Start Date *
                    </label>
                    <Input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Due Date *
                    </label>
                    <Input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Budget (USD)
                  </label>
                  <Input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                {/* Config Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Margin Target (%) *
                    </label>
                    <Input
                      type="number"
                      name="margin_target"
                      value={formData.margin_target}
                      onChange={handleChange}
                      placeholder="30"
                      step="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Revision Rounds *
                    </label>
                    <Input
                      type="number"
                      name="revision_rounds"
                      value={formData.revision_rounds}
                      onChange={handleChange}
                      placeholder="2"
                      step="1"
                      required
                    />
                  </div>
                </div>

                {/* Brief */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Project Brief
                  </label>
                  <textarea
                    name="brief"
                    value={formData.brief}
                    onChange={handleChange}
                    placeholder="Describe the project scope, goals, and key deliverables..."
                    rows={4}
                    className="w-full px-3 py-2 rounded border bg-[#0C0E12] border-[#2a2f3d] text-white placeholder-[#6b7280] transition-colors duration-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-[#2a2f3d]">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 rounded border border-[#2a2f3d] bg-[#0C0E12] text-white hover:bg-[#181B24] transition-colors"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    isLoading={isLoading}
                  >
                    Create Project
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
