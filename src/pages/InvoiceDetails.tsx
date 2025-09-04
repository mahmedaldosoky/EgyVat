import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, Edit } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useInvoice, useUpdateInvoiceStatus } from '@/hooks/useInvoices'
import { formatCurrency, formatDate } from '@/lib/utils'

export function InvoiceDetails() {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>()
  const { data: invoice, isLoading, error } = useInvoice(invoiceNumber || '')
  const updateStatusMutation = useUpdateInvoiceStatus()

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'success'
      case 'sent': return 'default' 
      case 'draft': return 'outline'
      case 'overdue': return 'danger'
      default: return 'outline'
    }
  }

  const handleStatusUpdate = (newStatus: string) => {
    if (invoiceNumber) {
      updateStatusMutation.mutate({ invoiceNumber, status: newStatus })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Invoice not found</p>
        <Link to="/invoices" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
          ← Back to invoices
        </Link>
      </div>
    )
  }

  const subtotal = invoice.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0)
  const totalTax = invoice.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice * line.taxRate), 0)
  const total = subtotal + totalTax

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <Link to="/invoices">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Invoices
              </Button>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
            <Badge variant={getStatusVariant(invoice.status)}>
              {invoice.status}
            </Badge>
          </div>
          <p className="mt-2 text-gray-600">
            Created on {formatDate(invoice.createdAt)}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          {invoice.status !== 'paid' && (
            <div className="flex space-x-2">
              {invoice.status === 'draft' && (
                <Button 
                  onClick={() => handleStatusUpdate('sent')}
                  disabled={updateStatusMutation.isPending}
                >
                  Send Invoice
                </Button>
              )}
              {invoice.status === 'sent' && (
                <Button 
                  variant="success"
                  onClick={() => handleStatusUpdate('paid')}
                  disabled={updateStatusMutation.isPending}
                >
                  Mark as Paid
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">From</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold">{invoice.supplier.name}</p>
                  <p className="text-gray-600">{invoice.supplier.address}</p>
                  <p className="text-sm text-gray-500">
                    Tax Number: {invoice.supplier.taxNumber}
                  </p>
                  {invoice.supplier.activityCode && (
                    <p className="text-sm text-gray-500">
                      Activity Code: {invoice.supplier.activityCode}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">To</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold">{invoice.customer.name}</p>
                  <p className="text-gray-600">{invoice.customer.address}</p>
                  <p className="text-sm text-gray-500">
                    Tax Number: {invoice.customer.taxNumber}
                  </p>
                  {invoice.customer.activityCode && (
                    <p className="text-sm text-gray-500">
                      Activity Code: {invoice.customer.activityCode}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Description</th>
                      <th className="text-right py-3 px-2">Qty</th>
                      <th className="text-right py-3 px-2">Unit Price</th>
                      <th className="text-right py-3 px-2">Tax Rate</th>
                      <th className="text-right py-3 px-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 px-2">{line.description}</td>
                        <td className="text-right py-3 px-2">{line.quantity}</td>
                        <td className="text-right py-3 px-2">{formatCurrency(line.unitPrice)}</td>
                        <td className="text-right py-3 px-2">{(line.taxRate * 100).toFixed(0)}%</td>
                        <td className="text-right py-3 px-2 font-semibold">
                          {formatCurrency(line.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Issue Date:</span>
                <span className="font-medium">{formatDate(invoice.issueDateTime)}</span>
              </div>
              <div className="flex justify-between">
                <span>Currency:</span>
                <span className="font-medium">{invoice.currency}</span>
              </div>
              <div className="flex justify-between">
                <span>Exchange Rate:</span>
                <span className="font-medium">{invoice.exchangeRate}</span>
              </div>
              <div className="flex justify-between">
                <span>Document Type:</span>
                <span className="font-medium">{invoice.documentType}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (14%):</span>
                <span>{formatCurrency(totalTax)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-lg">Total:</span>
                  <span className="font-bold text-lg">{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Validation Errors */}
          {invoice.validationErrors && invoice.validationErrors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Validation Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {invoice.validationErrors.map((error, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium text-red-600">{error.field}:</span>
                      <span className="text-gray-600 ml-2">{error.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
