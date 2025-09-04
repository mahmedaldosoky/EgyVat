import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Eye } from 'lucide-react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useInvoices } from '@/hooks/useInvoices'
import { formatCurrency, formatDate } from '@/lib/utils'

export function InvoicesList() {
  const [searchTerm, setSearchTerm] = useState('')
  const { data: invoices, isLoading } = useInvoices()

  const filteredInvoices = invoices?.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
            <p className="mt-2 text-slate-600">
              Manage your Egyptian VAT invoices
            </p>
          </div>
          <Link to="/invoices/create">
            <Button className="bg-brand-600 hover:bg-brand-700 text-white shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="card-premium mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search invoices by number or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-200 focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
          </CardContent>
        </div>

        {/* Invoices List */}
        <div className="card-premium">
          <CardHeader className="card-premium-header">
            <CardTitle className="text-xl font-semibold text-slate-900">
              All Invoices ({filteredInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-32"></div>
                        <div className="h-3 bg-slate-200 rounded w-48"></div>
                      </div>
                      <div className="h-6 bg-slate-200 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInvoices.map((invoice) => {
                  const totalAmount = invoice.lines.reduce((sum, line) => {
                    const lineSubtotal = (line.quantity * line.unitPrice) - (line.discountAmount || 0)
                    const vatAmount = lineSubtotal * ((line.vatRate || 0) / 100)
                    return sum + lineSubtotal + vatAmount
                  }, 0)
                  
                  return (
                    <div key={invoice.uuid} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-slate-900">
                              {invoice.invoiceNumber}
                            </h3>
                            <span className={`status-${invoice.status === 'validated' ? 'validated' : 
                                           invoice.status === 'sent' ? 'pending' : 'draft'}`}>
                              {invoice.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">
                            <span className="font-medium">{invoice.customer.name}</span>
                            {' • '}
                            <span>{formatDate(invoice.issueDateTime)}</span>
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="font-semibold text-slate-900">
                              {formatCurrency(totalAmount)}
                            </p>
                            <p className="text-sm text-slate-500">
                              {invoice.currency}
                            </p>
                          </div>
                          <Link to={`/invoices/${encodeURIComponent(invoice.invoiceNumber)}`}>
                            <Button variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:bg-slate-50">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {filteredInvoices.length === 0 && !isLoading && (
                  <div className="text-center py-12">
                    <p className="text-slate-500">No invoices found</p>
                    {searchTerm && (
                      <p className="text-sm text-slate-400 mt-1">
                        Try adjusting your search terms
                      </p>
                    )}
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