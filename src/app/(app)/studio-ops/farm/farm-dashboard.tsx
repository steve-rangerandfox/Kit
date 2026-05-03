// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

type RenderNodeStatus = 'online' | 'offline' | 'error' | 'rendering'

interface RenderNode {
  id: string
  name: string
  status: RenderNodeStatus
  jobName?: string
  progress?: number
  gpuTemp: number
  lastReported: string
  gpuModel: string
}

const mockNodes: RenderNode[] = [
  {
    id: '1',
    name: 'Node-Alpha',
    status: 'rendering',
    jobName: 'BlackMirror_EP7_4K_PreComp',
    progress: 65,
    gpuTemp: 72,
    lastReported: '2 seconds ago',
    gpuModel: 'RTX 4090',
  },
  {
    id: '2',
    name: 'Node-Beta',
    status: 'rendering',
    jobName: 'Acme_TVC_VFX_Render',
    progress: 42,
    gpuTemp: 68,
    lastReported: '1 second ago',
    gpuModel: 'RTX 4090',
  },
  {
    id: '3',
    name: 'Node-Gamma',
    status: 'online',
    gpuTemp: 28,
    lastReported: '3 seconds ago',
    gpuModel: 'RTX 4080',
  },
  {
    id: '4',
    name: 'Node-Delta',
    status: 'error',
    gpuTemp: 92,
    lastReported: '15 seconds ago',
    gpuModel: 'RTX 4090',
  },
  {
    id: '5',
    name: 'Node-Epsilon',
    status: 'rendering',
    jobName: 'Nike_Commercial_Final',
    progress: 88,
    gpuTemp: 82,
    lastReported: '1 second ago',
    gpuModel: 'RTX A6000',
  },
  {
    id: '6',
    name: 'Node-Zeta',
    status: 'online',
    gpuTemp: 35,
    lastReported: '4 seconds ago',
    gpuModel: 'RTX 4080',
  },
  {
    id: '7',
    name: 'Node-Theta',
    status: 'offline',
    gpuTemp: 0,
    lastReported: '5 minutes ago',
    gpuModel: 'RTX 4090',
  },
  {
    id: '8',
    name: 'Node-Iota',
    status: 'rendering',
    jobName: 'Spotify_Podcast_Motion',
    progress: 23,
    gpuTemp: 65,
    lastReported: '2 seconds ago',
    gpuModel: 'RTX 4080 Ti',
  },
  {
    id: '9',
    name: 'Node-Kappa',
    status: 'rendering',
    jobName: 'CNN_Segment_Color_Grade',
    progress: 76,
    gpuTemp: 71,
    lastReported: '1 second ago',
    gpuModel: 'RTX A6000',
  },
  {
    id: '10',
    name: 'Node-Lambda',
    status: 'online',
    gpuTemp: 32,
    lastReported: '3 seconds ago',
    gpuModel: 'RTX 4090',
  },
]

export function FarmDashboard() {
  const [nodes, setNodes] = useState<RenderNode[]>(mockNodes)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const onlineCount = nodes.filter((n) => n.status !== 'offline').length
  const offlineCount = nodes.filter((n) => n.status === 'offline').length
  const renderingCount = nodes.filter((n) => n.status === 'rendering').length

  const avgUtilization =
    nodes.length > 0
      ? Math.round(
          (renderingCount / nodes.filter((n) => n.status !== 'offline').length) * 100
        )
      : 0

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
    // Simulate data update
    setNodes((prevNodes) =>
      prevNodes.map((node) => ({
        ...node,
        gpuTemp: Math.max(20, Math.min(95, node.gpuTemp + (Math.random() - 0.5) * 10)),
      }))
    )
    setIsRefreshing(false)
  }

  const getStatusColor = (status: RenderNodeStatus): 'success' | 'warning' | 'danger' | 'default' => {
    switch (status) {
      case 'rendering':
        return 'info'
      case 'online':
        return 'success'
      case 'error':
        return 'danger'
      case 'offline':
        return 'default'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: RenderNodeStatus): string => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const getTempColor = (temp: number) => {
    if (temp < 70) return '#10B981'
    if (temp < 85) return '#F59E0B'
    return '#EF4444'
  }

  const getTempVariant = (
    temp: number
  ): 'success' | 'warning' | 'danger' => {
    if (temp < 70) return 'success'
    if (temp < 85) return 'warning'
    return 'danger'
  }

  return (
    <div className="space-y-6">
      {/* Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Farm Health</CardTitle>
              <CardDescription>Render node status overview</CardDescription>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0C0E12] rounded-lg p-4">
              <p className="text-[#9ca3af] text-sm mb-2">Online Nodes</p>
              <p className="text-3xl font-bold text-white font-mono">{onlineCount}</p>
            </div>
            <div className="bg-[#0C0E12] rounded-lg p-4">
              <p className="text-[#9ca3af] text-sm mb-2">Offline Nodes</p>
              <p className="text-3xl font-bold text-red-400 font-mono">{offlineCount}</p>
            </div>
            <div className="bg-[#0C0E12] rounded-lg p-4">
              <p className="text-[#9ca3af] text-sm mb-2">Rendering</p>
              <p className="text-3xl font-bold text-indigo-400 font-mono">{renderingCount}</p>
            </div>
            <div className="bg-[#0C0E12] rounded-lg p-4">
              <p className="text-[#9ca3af] text-sm mb-2">Utilization</p>
              <p className="text-3xl font-bold text-emerald-400 font-mono">{avgUtilization}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Node Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Render Nodes</CardTitle>
          <CardDescription>Individual node status and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nodes.map((node) => (
              <div
                key={node.id}
                className="bg-[#0C0E12] border border-[#2a2f3d] rounded-lg p-4 hover:border-indigo-500/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-white">{node.name}</p>
                    <p className="text-xs text-[#9ca3af]">{node.gpuModel}</p>
                  </div>
                  <Badge variant={getStatusColor(node.status)} size="sm">
                    {getStatusLabel(node.status)}
                  </Badge>
                </div>

                {node.status === 'rendering' && node.jobName && (
                  <div className="mb-3">
                    <p className="text-sm text-white mb-2 truncate">{node.jobName}</p>
                    <div className="w-full bg-[#181B24] rounded-full h-2 border border-[#2a2f3d]">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all"
                        style={{ width: `${node.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-[#9ca3af] mt-1 font-mono">
                      {node.progress}%
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-[#9ca3af]">GPU Temp</p>
                    <Badge variant={getTempVariant(node.gpuTemp)} size="sm">
                      <span
                        style={{
                          color: getTempColor(node.gpuTemp),
                        }}
                      >
                        {node.gpuTemp}°C
                      </span>
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-[#6b7280]">
                  Last reported: {node.lastReported}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status History Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Farm Metrics (24h)</CardTitle>
          <CardDescription>Average utilization and uptime over the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-[#0C0E12] border border-[#2a2f3d] rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/10 mb-3">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full opacity-20"></div>
              </div>
              <p className="text-[#9ca3af]">Chart visualization coming soon</p>
              <p className="text-[#6b7280] text-xs mt-1">Real-time metrics will be displayed here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
