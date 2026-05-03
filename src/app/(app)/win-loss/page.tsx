import { PitchTracker } from './pitch-tracker'

export const metadata = {
  title: 'Win/Loss — Kit',
  description: 'Track your pitch success rate',
}

export default function WinLossPage() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-8">
        <div className="max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Win/Loss</h1>
            <p className="text-[#9ca3af]">Track your pitch success rate</p>
          </div>

          <PitchTracker />
        </div>
      </div>
    </div>
  )
}
