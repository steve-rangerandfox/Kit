'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Upload, File, Lock, Users } from 'lucide-react'
import { useState } from 'react'

interface Project {
  documents: Array<{
    id: string
    title: string
    type: string
    visibility: string
    date: Date
  }>
}

export function ContextTab({ project }: { project: Project }) {
  const [searchQuery, setSearchQuery] = useState('')

  const documentTypeInfo = {
    brief: { label: 'Brief', color: 'info', icon: File },
    reference: { label: 'Reference', color: 'default', icon: File },
    guideline: { label: 'Guideline', color: 'default', icon: File },
    contract: { label: 'Contract', color: 'warning', icon: File },
    budget: { label: 'Budget', color: 'warning', icon: File },
    schedule: { label: 'Schedule', color: 'default', icon: File },
    feedback: { label: 'Feedback', color: 'default', icon: File },
    archive: { label: 'Archive', color: 'default', icon: File },
  }

  const visibilityInfo = {
    team: { label: 'Team', icon: Users },
    founder: { label: 'Founder Only', icon: Lock },
  }

  const filteredDocs = project.documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <h2 className="text-xl font-semibold text-white">Project Knowledge Base</h2>
        <Button size="sm" variant="primary" className="gap-2 whitespace-nowrap">
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
        <input
          type="text"
          placeholder="Search project documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#181B24] border border-[#2a2f3d] rounded pl-10 pr-4 py-2 text-white placeholder-[#6b7280] focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Document Categories */}
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-white mb-4 uppercase text-[#9ca3af]">
            Indexed Documents ({filteredDocs.length})
          </h3>

          {filteredDocs.length > 0 ? (
            <div className="space-y-3">
              {filteredDocs.map((doc) => {
                const typeInfo = documentTypeInfo[doc.type as keyof typeof documentTypeInfo] || {
                  label: 'Document',
                  color: 'default',
                }
                const visInfo = visibilityInfo[doc.visibility as keyof typeof visibilityInfo] || {
                  label: 'Team',
                }
                const VisIcon = visInfo.icon

                return (
                  <Card key={doc.id} className="kit-card hover:border-[#3a3f4d] transition-colors group cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium group-hover:text-indigo-300 transition-colors truncate">
                            {doc.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge
                              variant={
                                typeInfo.color as 'default' | 'success' | 'warning' | 'danger' | 'info'
                              }
                              size="sm"
                            >
                              {typeInfo.label}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-[#9ca3af]">
                              <VisIcon className="w-3 h-3" />
                              {visInfo.label}
                            </div>
                            <span className="text-xs text-[#6b7280]">
                              {doc.date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>

                        <Button size="sm" variant="ghost" className="flex-shrink-0">
                          Open
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="kit-card">
              <CardContent className="pt-6">
                <p className="text-center text-[#9ca3af]">
                  {searchQuery
                    ? 'No documents match your search'
                    : 'No documents indexed yet. Upload a document to get started.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Semantic Search Info */}
      <Card className="kit-card border border-indigo-500/30 bg-indigo-500/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-400" />
            Semantic Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#9ca3af] leading-relaxed">
            All documents are indexed for semantic search. Try searching for concepts or topics (e.g., "color specifications", "timeline", "deliverables") rather than exact file names. The search engine understands the content and relationships between documents.
          </p>
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <Card className="kit-card border-2 border-dashed border-[#2a2f3d] hover:border-indigo-500/50 transition-colors">
        <CardContent className="pt-12 pb-12">
          <div className="text-center space-y-4">
            <Upload className="w-8 h-8 text-[#6b7280] mx-auto" />
            <div>
              <p className="text-white font-medium">Drag documents here to upload</p>
              <p className="text-sm text-[#9ca3af] mt-1">
                or click to browse. PDFs, Word docs, images, and spreadsheets supported.
              </p>
            </div>
            <Button size="sm" variant="secondary">
              Browse Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Document Visibility */}
      <Card className="kit-card">
        <CardHeader>
          <CardTitle className="text-base">Document Visibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Team</h4>
            <p className="text-sm text-[#9ca3af]">
              Visible to all team members assigned to this project. Use for general project documentation.
            </p>
          </div>
          <div className="border-t border-[#2a2f3d] pt-4">
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              Founder Only
            </h4>
            <p className="text-sm text-[#9ca3af]">
              Only visible to founders. Use for sensitive contracts, budgets, and internal discussions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
