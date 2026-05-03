import { FarmDashboard } from './farm-dashboard'

export const metadata = {
  title: 'Render Farm — Kit',
  description: 'Monitor your render farm health',
}

export default function RenderFarmPage() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-8">
        <div className="max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Render Farm</h1>
            <p className="text-[#9ca3af]">Monitor your render farm health</p>
          </div>

          <FarmDashboard />
        </div>
      </div>
    </div>
  )
}
