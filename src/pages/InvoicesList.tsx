import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'success'
      case 'sent': return 'default'
      case 'draft': return 'outline'
      case 'overdue': return 'danger'
      default: return 'outline'
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-2 text-gray-600">
            Manage your Egyptian VAT invoices
          </p>
        </div>
        <Link to="/invoices/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search invoices by number or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices ({filteredInvoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-48"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => {
                const totalAmount = invoice.lines.reduce((sum, line) => sum + line.amount, 0)
                
                return (
                  <div key={invoice.uuid} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900">
                            {invoice.invoiceNumber}
                          </h3>
                          <Badge variant={getStatusVariant(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">{invoice.customer.name}</span>
                          {' • '}
                          <span>{formatDate(invoice.issueDateTime)}</span>
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(totalAmount)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {invoice.currency}
                          </p>
                        </div>
                        <Link to={`/invoices/${encodeURIComponent(invoice.invoiceNumber)}`}>
                          <Button variant="outline" size="sm">
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
                  <p className="text-gray-500">No invoices found</p>
                  {searchTerm && (
                    <p className="text-sm text-gray-400 mt-1">
                      Try adjusting your search terms
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
