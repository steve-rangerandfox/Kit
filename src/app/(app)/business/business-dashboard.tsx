'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Project {
  id: string
  name: string
  revenue: number
  expenses: number
  marginTarget: number
  marginActual: number
}

interface FinancialEntry {
  id: string
  type: 'invoice' | 'expense' | 'payment'
  description: string
  amount: number
  vendor: string
  status: 'paid' | 'pending' | 'overdue'
  date: string
}

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'BlackMirror Episode 7',
    revenue: 125000,
    expenses: 78500,
    marginTarget: 40,
    marginActual: 37.2,
  },
  {
    id: '2',
    name: 'Acme Corp TVC',
    revenue: 85000,
    expenses: 48300,
    marginTarget: 35,
    marginActual: 43.2,
  },
  {
    id: '3',
    name: 'Nike Commercial Series',
    revenue: 220000,
    expenses: 135200,
    marginTarget: 40,
    marginActual: 38.5,
  },
  {
    id: '4',
    name: 'Spotify Podcast Motion',
    revenue: 45000,
    expenses: 32100,
    marginTarget: 30,
    marginActual: 28.7,
  },
  {
    id: '5',
    name: 'CNN Segment Graphics',
    revenue: 32000,
    expenses: 18500,
    marginTarget: 42,
    marginActual: 42.2,
  },
]

const mockEntries: FinancialEntry[] = [
  {
    id: '1',
    type: 'invoice',
    description: 'BlackMirror Ep7 - Final Invoice',
    amount: 125000,
    vendor: 'Netflix Production',
    status: 'paid',
    date: '2026-04-01',
  },
  {
    id: '2',
    type: 'expense',
    description: 'Render Farm Usage - March',
    amount: 12500,
    vendor: 'RebusFarm',
    status: 'paid',
    date: '2026-03-31',
  },
  {
    id: '3',
    type: 'payment',
    description: 'Artist Freelance Payment',
    amount: 8900,
    vendor: 'Jane Smith',
    status: 'paid',
    date: '2026-03-28',
  },
  {
    id: '4',
    type: 'invoice',
    description: 'Nike Commercial - Milestone 2',
    amount: 110000,
    vendor: 'Nike Global',
    status: 'pending',
    date: '2026-04-05',
  },
  {
    id: '5',
    type: 'expense',
    description: 'Software Licenses - April',
    amount: 3200,
    vendor: 'Adobe Creative Cloud',
    status: 'pending',
    date: '2026-04-10',
  },
  {
    id: '6',
    type: 'invoice',
    description: 'Acme Corp TVC - Final',
    amount: 85000,
    vendor: 'Acme Corporation',
    status: 'overdue',
    date: '2026-03-15',
  },
  {
    id: '7',
    type: 'expense',
    description: 'Equipment Rental',
    amount: 5400,
    vendor: 'Panavision',
    status: 'paid',
    date: '2026-03-25',
  },
  {
    id: '8',
    type: 'payment',
    description: 'VFX Supervisor Contract',
    amount: 18500,
    vendor: 'Marcus Johnson',
    status: 'paid',
    date: '2026-03-20',
  },
  {
    id: '9',
    type: 'invoice',
    description: 'CNN Graphics Package',
    amount: 32000,
    vendor: 'CNN International',
    status: 'pending',
    date: '2026-04-08',
  },
  {
    id: '10',
    type: 'expense',
    description: 'Color Grading Studio Rental',
    amount: 2800,
    vendor: 'Formosa Group',
    status: 'paid',
    date: '2026-03-22',
  },
]

export function BusinessDashboard() {
  const totalRevenue = mockProjects.reduce((sum, p) => sum + p.revenue, 0)
  const totalExpenses = mockProjects.reduce((sum, p) => sum + p.expenses, 0)
  const netProfit = totalRevenue - totalExpenses

  const apTotal = mockEntries
    .filter((e) => e.type === 'expense' || e.type === 'payment')
    .reduce((sum, e) => sum + e.amount, 0)

  const apOverdue = mockEntries
    .filter((e) => (e.type === 'expense' || e.type === 'payment') && e.status === 'overdue')
    .reduce((sum, e) => sum + e.amount, 0)

  const arTotal = mockEntries
    .filter((e) => e.type === 'invoice')
    .reduce((sum, e) => sum + e.amount, 0)

  const arOverdue = mockEntries
    .filter((e) => e.type === 'invoice' && e.status === 'overdue')
    .reduce((sum, e) => sum + e.amount, 0)

  const sortedProjects = [...mockProjects].sort((a, b) => b.marginActual - a.marginActual)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getStatusBadge = (
    status: 'paid' | 'pending' | 'overdue'
  ): 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'paid':
        return 'success'
      case 'pending':
        return 'warning'
      case 'overdue':
        return 'danger'
    }
  }

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
          <CardDescription>Total revenue, expenses, and net profit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0C0E12] rounded-lg p-6 border border-[#2a2f3d]">
              <p className="text-[#9ca3af] text-sm mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-emerald-400 font-mono">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="bg-[#0C0E12] rounded-lg p-6 border border-[#2a2f3d]">
              <p className="text-[#9ca3af] text-sm mb-2">Total Expenses</p>
              <p className="text-3xl font-bold text-amber-400 font-mono">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="bg-[#0C0E12] rounded-lg p-6 border border-[#2a2f3d]">
              <p className="text-[#9ca3af] text-sm mb-2">Net Profit</p>
              <p
                className={`text-3xl font-bold font-mono ${
                  netProfit > 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {formatCurrency(netProfit)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Margins Ranked */}
      <Card>
        <CardHeader>
          <CardTitle>Project Margins</CardTitle>
          <CardDescription>Target vs actual margin performance by project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedProjects.map((project) => {
              const marginDiff = project.marginActual - project.marginTarget
              return (
                <div key={project.id} className="bg-[#0C0E12] rounded-lg p-4 border border-[#2a2f3d]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-white">{project.name}</p>
                      <p className="text-xs text-[#9ca3af]">
                        {formatCurrency(project.revenue)} revenue
                      </p>
                    </div>
                    <Badge
                      variant={marginDiff >= 0 ? 'success' : 'warning'}
                      size="sm"
                    >
                      {project.marginActual.toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="w-full bg-[#181B24] rounded-full h-3 border border-[#2a2f3d]">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full"
                          style={{ width: `${(project.marginActual / 100) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right min-w-fit">
                      <p className="text-xs text-[#9ca3af]">Target: {project.marginTarget}%</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* AP & AR Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Accounts Payable</CardTitle>
            <CardDescription>Outstanding vendor payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-[#0C0E12] rounded-lg p-4">
                <p className="text-[#9ca3af] text-sm mb-1">Total Outstanding</p>
                <p className="text-2xl font-bold text-white font-mono">
                  {formatCurrency(apTotal)}
                </p>
              </div>
              <div className="bg-[#0C0E12] rounded-lg p-4 border border-red-500/20">
                <p className="text-[#9ca3af] text-sm mb-1">Overdue Amount</p>
                <p className="text-2xl font-bold text-red-400 font-mono">
                  {formatCurrency(apOverdue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accounts Receivable</CardTitle>
            <CardDescription>Pending client invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-[#0C0E12] rounded-lg p-4">
                <p className="text-[#9ca3af] text-sm mb-1">Total Pending</p>
                <p className="text-2xl font-bold text-white font-mono">
                  {formatCurrency(arTotal)}
                </p>
              </div>
              <div className="bg-[#0C0E12] rounded-lg p-4 border border-red-500/20">
                <p className="text-[#9ca3af] text-sm mb-1">Overdue Amount</p>
                <p className="text-2xl font-bold text-red-400 font-mono">
                  {formatCurrency(arOverdue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest financial entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2f3d]">
                  <th className="text-left py-3 px-4 text-[#9ca3af] font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-[#9ca3af] font-medium">Description</th>
                  <th className="text-left py-3 px-4 text-[#9ca3af] font-medium">Amount</th>
                  <th className="text-left py-3 px-4 text-[#9ca3af] font-medium">Vendor</th>
                  <th className="text-left py-3 px-4 text-[#9ca3af] font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockEntries.slice(0, 10).map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-[#2a2f3d] hover:bg-[#181B24]/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Badge variant="info" size="sm">
                        {entry.type === 'invoice'
                          ? 'Invoice'
                          : entry.type === 'expense'
                            ? 'Expense'
                            : 'Payment'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-white">{entry.description}</td>
                    <td className="py-3 px-4 text-white font-mono">
                      {formatCurrency(entry.amount)}
                    </td>
                    <td className="py-3 px-4 text-[#9ca3af]">{entry.vendor}</td>
                    <td className="py-3 px-4">
                      <Badge variant={getStatusBadge(entry.status)} size="sm">
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
