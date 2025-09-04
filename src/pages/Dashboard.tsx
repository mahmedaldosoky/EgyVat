import { FileText, DollarSign, CheckCircle, Clock, TrendingUp, ArrowUpRight, Eye, Download } from 'lucide-react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboardStats, useInvoices } from '@/hooks/useInvoices'
import { formatCurrency } from '@/lib/utils'
import { Link } from 'react-router-dom'

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: recentInvoices, isLoading: invoicesLoading } = useInvoices()

  // Export to PDF function
  const exportToPDF = () => {
    window.print() // Simple implementation - opens print dialog
  }

  // Analytics function
  const openAnalytics = () => {
    // Navigate to analytics page or open modal
    alert('Analytics feature coming soon!')
  }

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-premium animate-pulse">
                <div className="card-premium-content">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
                  <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Ensure recentInvoices is always an array
  const invoicesArray = Array.isArray(recentInvoices) ? recentInvoices : []

  const metrics = [
    {
      title: 'Total Invoices',
      value: stats?.totalInvoices || 0,
      icon: FileText,
      trend: '+12%',
      trendUp: true,
      color: 'navy'
    },
    {
      title: 'Total Revenue',
      value: stats?.totalRevenue ? formatCurrency(stats.totalRevenue) : 'EGP 0.00',
      icon: DollarSign,
      trend: '+8.2%',
      trendUp: true,
      color: 'brand'
    },
    {
      title: 'Validated Invoices',
      value: stats?.paidInvoices || 0,
      icon: CheckCircle,
      trend: '+5.1%',
      trendUp: true,
      color: 'success'
    },
    {
      title: 'Pending Review',
      value: stats?.pendingInvoices || 0,
      icon: Clock,
      trend: '-2.4%',
      trendUp: false,
      color: 'warning'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Premium Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="animate-fade-in">
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                Executive Dashboard
              </h1>
              <p className="mt-2 text-lg text-slate-600 font-medium">
                Egyptian VAT Invoice Management Platform
              </p>
              <div className="mt-1 flex items-center text-sm text-slate-500">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200 mr-3">
                  Enterprise Edition
                </span>
                <span>Last updated: {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={exportToPDF}
                className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors duration-200"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </button>
              <button 
                onClick={openAnalytics}
                className="inline-flex items-center px-4 py-2 bg-brand-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-brand-700 transition-colors duration-200 shadow-sm"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Executive KPI Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <div key={metric.title} className="metric-card animate-fade-in" style={{animationDelay: `${index * 100}ms`}}>
              <CardHeader className="metric-header">
                <CardTitle className="metric-title">{metric.title}</CardTitle>
                <div className={`p-2 rounded-lg ${
                  metric.color === 'brand' ? 'bg-brand-50' :
                  metric.color === 'navy' ? 'bg-slate-50' :
                  metric.color === 'success' ? 'bg-success-50' :
                  'bg-warning-50'
                }`}>
                  <metric.icon className={`h-5 w-5 ${
                    metric.color === 'brand' ? 'text-brand-600' :
                    metric.color === 'navy' ? 'text-slate-600' :
                    metric.color === 'success' ? 'text-success-600' :
                    'text-warning-600'
                  }`} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="metric-value">{metric.value}</div>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className={`h-4 w-4 mr-1 ${
                    metric.trendUp ? 'text-success-600' : 'text-error-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    metric.trendUp ? 'text-success-600' : 'text-error-600'
                  }`}>
                    {metric.trend}
                  </span>
                  <span className="text-sm text-slate-500 ml-1">vs last month</span>
                </div>
              </CardContent>
            </div>
          ))}
        </div>

        {/* Recent Invoices Table */}
        <div className="card-premium animate-fade-in">
          <CardHeader className="card-premium-header">
            <div className="flex items-center justify-between">
              <div className="text-center ">
                <CardTitle className="text-xl font-semibold text-slate-900">Recent Invoices</CardTitle>
                <p className="mt-1 text-sm text-slate-500">Latest transactions and their current status</p>
              </div>
<Link 
  to="/invoices"
  className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors duration-200"
/>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {invoicesLoading ? (
              <div className="px-6 py-8">
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center justify-between py-3">
                      <div className="flex-1">
                        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                      </div>
                      <div className="text-right">
                        <div className="h-4 bg-slate-200 rounded w-20 mb-2"></div>
                        <div className="h-6 bg-slate-200 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Invoice Details
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoicesArray.slice(0, 5).map((invoice, index) => (
                      <tr key={invoice.uuid} className="border-b border-slate-100 hover:bg-slate-50 animate-slide-in" style={{animationDelay: `${index * 50}ms`}}>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">
                              {invoice.documentType} • {invoice.currency}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-900">{invoice.customer.name}</p>
                            <p className="text-sm text-slate-500">
                              {invoice.customer.type === 'b2B' ? 'Business' : 'Individual'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-lg text-slate-900">
                            {formatCurrency(
                              invoice.lines.reduce((sum, line) => {
                                const lineSubtotal = (line.quantity * line.unitPrice) - (line.discountAmount || 0)
                                const vatAmount = lineSubtotal * ((line.vatRate || 0) / 100)
                                return sum + lineSubtotal + vatAmount
                              }, 0)
                            )}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`status-${invoice.status === 'validated' ? 'validated' : 
                                           invoice.status === 'sent' ? 'pending' : 'draft'}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600">
                            {new Date(invoice.issueDateTime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!invoicesArray.length && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-lg font-medium text-slate-500">No invoices found</p>
                    <p className="text-sm text-slate-400">Create your first invoice to get started</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </div>
  )
}