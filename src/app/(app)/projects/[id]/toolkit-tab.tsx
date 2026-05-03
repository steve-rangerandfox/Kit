'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Calendar,
  Sparkles,
  LayoutGrid,
  PieChart,
  Zap,
  BookOpen,
  ArrowRight,
} from 'lucide-react'
import { useState } from 'react'

const toolkitModules = [
  {
    id: 'sow',
    title: 'Generate SOW',
    description: 'Create a detailed Statement of Work based on project scope and requirements',
    icon: FileText,
    status: 'active' as const,
    color: 'indigo',
  },
  {
    id: 'schedule',
    title: 'Generate Workback Schedule',
    description: 'Auto-generate a comprehensive project timeline with dependencies and critical path',
    icon: Calendar,
    status: 'active' as const,
    color: 'emerald',
  },
  {
    id: 'script',
    title: 'Generate Script',
    description: 'AI-powered script generation based on creative brief and campaign objectives',
    icon: Sparkles,
    status: 'active' as const,
    color: 'amber',
  },
  {
    id: 'storyboard',
    title: 'Generate Storyboard',
    description: 'Automatically create visual storyboards with AI image generation',
    icon: LayoutGrid,
    status: 'coming_soon' as const,
    color: 'purple',
  },
  {
    id: 'deck',
    title: 'Build Deck',
    description: 'Generate client-ready presentation deck with project overview and deliverables',
    icon: PieChart,
    status: 'coming_soon' as const,
    color: 'blue',
  },
  {
    id: 'publish',
    title: 'Publish Assets',
    description: 'One-click publishing to client portals and asset management systems',
    icon: Zap,
    status: 'coming_soon' as const,
    color: 'cyan',
  },
  {
    id: 'postmortem',
    title: 'Generate Post-Mortem',
    description: 'AI-powered retrospective analysis with lessons learned and recommendations',
    icon: BookOpen,
    status: 'active' as const,
    color: 'rose',
  },
]

export function ToolkitTab() {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [completedId, setCompletedId] = useState<string | null>(null)

  const handleGenerate = async (moduleId: string) => {
    setLoadingId(moduleId)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setLoadingId(null)
    setCompletedId(moduleId)
    setTimeout(() => setCompletedId(null), 3000)
  }

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Production Toolkit</h2>
        <p className="text-[#9ca3af]">
          AI-powered tools to accelerate project workflows. Generate documents, schedules, and assets
          instantly.
        </p>
      </div>

      {/* Grid of Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {toolkitModules.map((module) => {
          const Icon = module.icon
          const isLoading = loadingId === module.id
          const isCompleted = completedId === module.id
          const isActive = module.status === 'active'

          const colorClasses = {
            indigo: 'bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-500/60 text-indigo-400',
            emerald: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400',
            amber: 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60 text-amber-400',
            purple: 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500/60 text-purple-400',
            blue: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/60 text-blue-400',
            cyan: 'bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400',
            rose: 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500/60 text-rose-400',
          }

          return (
            <Card
              key={module.id}
              className={`kit-card border transition-all cursor-pointer group ${
                isActive
                  ? colorClasses[module.color as keyof typeof colorClasses]
                  : 'border-[#2a2f3d] opacity-60'
              }`}
            >
              <CardContent className="pt-6 h-full flex flex-col">
                <div className="flex-1 space-y-3 mb-4">
                  <div className="flex items-start justify-between gap-2">
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : 'text-[#6b7280]'}`} />
                    {!isActive && (
                      <Badge variant="warning" size="sm">
                        Coming Soon
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className={`font-semibold ${isActive ? 'text-white' : 'text-[#9ca3af]'}`}>
                      {module.title}
                    </h3>
                    <p
                      className={`text-sm mt-2 leading-relaxed ${
                        isActive ? 'text-[#9ca3af]' : 'text-[#6b7280]'
                      }`}
                    >
                      {module.description}
                    </p>
                  </div>
                </div>

                {isActive && (
                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full gap-2"
                    onClick={() => handleGenerate(module.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Generating...
                      </>
                    ) : isCompleted ? (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Ready
                      </>
                    ) : (
                      <>
                        Generate
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Generations */}
      <Card className="kit-card">
        <div className="px-6 py-4 border-b border-[#2a2f3d]">
          <h3 className="font-semibold text-white">Recent Generations</h3>
        </div>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#181B24] rounded">
              <div>
                <p className="text-sm font-medium text-white">Nike Summer Campaign SOW</p>
                <p className="text-xs text-[#6b7280]">Generated 2 hours ago</p>
              </div>
              <Button size="sm" variant="ghost">
                Download
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#181B24] rounded">
              <div>
                <p className="text-sm font-medium text-white">Project Schedule</p>
                <p className="text-xs text-[#6b7280]">Generated yesterday</p>
              </div>
              <Button size="sm" variant="ghost">
                Download
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#181B24] rounded">
              <div>
                <p className="text-sm font-medium text-white">Campaign Script V2</p>
                <p className="text-xs text-[#6b7280]">Generated 3 days ago</p>
              </div>
              <Button size="sm" variant="ghost">
                Download
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="kit-card border border-indigo-500/30 bg-indigo-500/5">
        <CardContent className="pt-6">
          <h4 className="text-sm font-semibold text-white mb-3">Tips for Best Results</h4>
          <ul className="space-y-2 text-sm text-[#9ca3af]">
            <li>• Ensure your project brief is detailed and specific for more accurate generations</li>
            <li>• Review and edit generated documents before sharing with clients</li>
            <li>• Use consistent terminology across your project for better AI understanding</li>
            <li>• Save generation history for easy reference and iteration</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
