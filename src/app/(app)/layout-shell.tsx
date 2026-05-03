'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FolderKanban,
  AlertCircle,
  MessageSquare,
  Server,
  TrendingUp,
  Target,
  Settings,
  Menu,
  X,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface LayoutShellProps {
  children: React.ReactNode
  user?: {
    name?: string
    email?: string
    avatar?: string
  }
  workspace?: string
}

const navItems = [
  { label: 'Command Center', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Projects', icon: FolderKanban, href: '/projects' },
  { label: 'Actions', icon: AlertCircle, href: '/actions' },
  { label: 'Ask Kit', icon: MessageSquare, href: '/ask' },
  { label: 'Render Farm', icon: Server, href: '/studio-ops/farm' },
  { label: 'Business Health', icon: TrendingUp, href: '/business' },
  { label: 'Win/Loss', icon: Target, href: '/win-loss' },
  { label: 'Settings', icon: Settings, href: '/settings' },
]

export function LayoutShell({ children, user, workspace }: LayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="flex min-h-screen bg-[#0C0E12]">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-[#181B24] border border-[#2a2f3d] text-white"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="md:hidden fixed inset-0 z-30 bg-black/50"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        <motion.aside
          initial={{ x: -256, opacity: 0 }}
          animate={{
            x: sidebarOpen ? 0 : -256,
            opacity: 1,
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={cn(
            'fixed md:static w-64 h-screen flex flex-col bg-[#0C0E12] border-r border-[#2a2f3d] z-40 md:translate-x-0',
            !sidebarOpen && '-translate-x-full md:translate-x-0'
          )}
        >
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-6 border-b border-[#2a2f3d]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <span className="text-white font-semibold text-lg">Kit</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-all duration-200',
                    active
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-[#9ca3af] hover:text-white hover:bg-[#181B24] border border-transparent'
                  )}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User info */}
          {user && (
            <div className="px-3 py-4 border-t border-[#2a2f3d]">
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#181B24] border border-[#2a2f3d]">
                <Avatar name={user.name} src={user.avatar} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name || 'User'}</p>
                  <p className="text-xs text-[#6b7280] truncate">{workspace || 'Workspace'}</p>
                </div>
              </div>
            </div>
          )}
        </motion.aside>
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
