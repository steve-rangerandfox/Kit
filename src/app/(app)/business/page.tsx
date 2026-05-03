import { BusinessDashboard } from './business-dashboard'

export const metadata = {
  title: 'Business Health — Kit',
  description: 'Financial overview and margins',
}

export default function BusinessHealthPage() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-8">
        <div className="max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Business Health</h1>
            <p className="text-[#9ca3af]">Financial overview and margins</p>
          </div>

          <BusinessDashboard />
        </div>
      </div>
    </div>
  )
}
