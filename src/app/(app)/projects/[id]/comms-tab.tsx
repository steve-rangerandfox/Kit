'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, Phone, Users } from 'lucide-react'
import { useState } from 'react'

interface Project {
  call_actions: Array<{
    id: string
    call_type: string
    date: Date
    summary: string
    action_items: string[]
    draft_email: string
  }>
}

export function CommsTab({ project }: { project: Project }) {
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null)

  const callTypeInfo = {
    client_review: {
      label: 'Client Review',
      color: 'info',
      icon: Phone,
    },
    internal_standup: {
      label: 'Internal Standup',
      color: 'default',
      icon: Users,
    },
    budget_review: {
      label: 'Budget Review',
      color: 'warning',
      icon: Phone,
    },
  }

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Post-Call Action Breakdowns</h2>
          <Button size="sm" variant="primary">
            Process New Transcript
          </Button>
        </div>

        <div className="space-y-4">
          {project.call_actions.map((call) => {
            const typeInfo = callTypeInfo[call.call_type as keyof typeof callTypeInfo] || {
              label: 'Call',
              color: 'default',
              icon: Phone,
            }
            const Icon = typeInfo.icon

            return (
              <Card key={call.id} className="kit-card">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-4 h-4 text-indigo-400" />
                          <Badge
                            variant={typeInfo.color as 'default' | 'success' | 'warning' | 'danger' | 'info'}
                            size="sm"
                          >
                            {typeInfo.label}
                          </Badge>
                          <span className="text-xs text-[#6b7280]">
                            {call.date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="text-white font-medium">{call.summary}</p>
                      </div>
                    </div>

                    {/* Action Items */}
                    <div className="bg-[#181B24] rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-white mb-3">Action Items</h4>
                      <ul className="space-y-2">
                        {call.action_items.map((item, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-indigo-400 flex-shrink-0">✓</span>
                            <span className="text-sm text-white">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Draft Email */}
                    <div>
                      <button
                        onClick={() =>
                          setExpandedEmail(expandedEmail === call.id ? null : call.id)
                        }
                        className="flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            expandedEmail === call.id ? 'rotate-180' : ''
                          }`}
                        />
                        Draft Client Email
                      </button>

                      {expandedEmail === call.id && (
                        <div className="mt-3 bg-[#181B24] rounded-lg p-4 space-y-3">
                          <div className="bg-[#0C0E12] rounded p-3 text-sm text-white whitespace-pre-wrap font-mono text-xs leading-relaxed">
                            {call.draft_email}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                navigator.clipboard.writeText(call.draft_email)
                                alert('Email copied to clipboard!')
                              }}
                            >
                              Copy Email
                            </Button>
                            <Button size="sm" variant="secondary">
                              Edit & Send
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Communication Guidelines */}
      <Card className="kit-card">
        <CardHeader>
          <CardTitle>Communication Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Client Communication</h4>
              <ul className="text-sm text-[#9ca3af] space-y-1">
                <li>• Weekly check-in emails every Friday EOD</li>
                <li>• Response time target: 24 hours for client inquiries</li>
                <li>• All major decisions require documented client approval</li>
              </ul>
            </div>
            <div className="border-t border-[#2a2f3d] pt-4">
              <h4 className="text-sm font-semibold text-white mb-2">Team Communication</h4>
              <ul className="text-sm text-[#9ca3af] space-y-1">
                <li>• Daily 15-minute standups at 10am PST</li>
                <li>• Use #nike-summer Slack channel for project updates</li>
                <li>• Escalate blockers immediately to producer</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
