import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Kit — Dashboard',
  description: 'Production intelligence dashboard',
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  // Check if user has completed onboarding
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id')
    .limit(1)

  if (!workspaces || workspaces.length === 0) {
    redirect('/onboarding')
  }

  return (
    <div className="flex min-h-screen bg-[#0C0E12]">
      {/* Sidebar placeholder - can be expanded later */}
      <aside className="hidden md:flex md:w-64 flex-col bg-[#181B24] border-r border-[#2a2f3d]">
        {/* Sidebar content will go here */}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
