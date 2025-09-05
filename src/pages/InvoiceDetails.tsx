import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, Building2, User, Calendar, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useInvoice, useUpdateInvoiceStatus } from '@/hooks/useInvoices'
import { formatCurrency, formatDate } from '@/lib/utils'
import { generatePDF } from '@/lib/pdfGenerator'

export function InvoiceDetails() {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>()
  const { data: invoice, isLoading, error } = useInvoice(invoiceNumber || '')
  const updateStatusMutation = useUpdateInvoiceStatus()

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': 
      case 'validated': return 'success'
      case 'sent': return 'default' 
      case 'draft': return 'outline'
      case 'overdue': return 'danger'
      default: return 'outline'
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'validated': return 'Validated'
      case 'paid': return 'Paid'
      case 'sent': return 'Sent'
      case 'draft': return 'Draft'
      case 'overdue': return 'Overdue'
      default: return status
    }
  }

  const handleStatusUpdate = (newStatus: string) => {
    if (invoiceNumber) {
      updateStatusMutation.mutate({ invoiceNumber, status: newStatus })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card><CardContent className="p-6"><div className="h-40 bg-gray-200 rounded"></div></CardContent></Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Invoice not found</p>
            <Link to="/invoices" className="text-brand-600 hover:text-brand-700 mt-4 inline-block font-medium">
              ← Back to invoices
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Calculate totals
  const lines = invoice.lines || []
  const subtotal = lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0)
  const totalTax = lines.reduce((sum, line) => {
    const taxRate = (line.taxRate || line.vatRate || 14) / 100
    return sum + (line.quantity * line.unitPrice * taxRate)
  }, 0)
  const total = subtotal + totalTax

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/invoices" className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">{invoice.invoiceNumber}</h1>
                <Badge variant={getStatusVariant(invoice.status || 'draft')} className="text-sm">
                  {getStatusDisplay(invoice.status || 'draft')}
                </Badge>
              </div>
              <div className="flex items-center text-slate-600 text-sm">
                <Calendar className="h-4 w-4 mr-2" />
                {formatDate(invoice.issueDateTime)}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => generatePDF(invoice)}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              {invoice?.status && invoice.status !== 'paid' && invoice.status !== 'validated' && (
                <>
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
                      onClick={() => handleStatusUpdate('paid')}
                      disabled={updateStatusMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Mark as Paid
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From */}
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
                    <Building2 className="h-5 w-5" />
                    From
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900 text-lg">{invoice.supplier?.name}</p>
                    <p className="text-slate-600">{invoice.supplier?.address}</p>
                    <p className="text-sm text-slate-500">
                      Tax Number: {invoice.supplier?.taxNumber}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* To */}
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
                    <User className="h-5 w-5" />
                    To
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900 text-lg">{invoice.customer?.name}</p>
                    <p className="text-slate-600">{invoice.customer?.address}</p>
                    {invoice.customer?.taxNumber && (
                      <p className="text-sm text-slate-500">
                        Tax Number: {invoice.customer.taxNumber}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Line Items */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lines && lines.length > 0 ? lines.map((line, index) => (
                    <div key={index} className="flex justify-between items-start p-4 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{line.description}</h4>
                        <p className="text-sm text-slate-600 mt-1">
                          {line.quantity} × {formatCurrency(line.unitPrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          {formatCurrency(line.quantity * line.unitPrice)}
                        </p>
                        <p className="text-sm text-slate-500">
                          +{((line.taxRate || line.vatRate || 14))}% VAT
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-slate-500">
                      No items found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Invoice Summary */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
                  <CreditCard className="h-5 w-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>VAT (14%)</span>
                    <span>{formatCurrency(totalTax)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold text-slate-900">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t text-sm text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Currency:</span>
                    <span>{invoice.currency || 'EGP'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Exchange Rate:</span>
                    <span>{invoice.exchangeRate || '1.00'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Validation Errors (only if there are errors) */}
            {invoice.validationErrors && invoice.validationErrors.length > 0 && (
              <Card className="border-red-200 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg text-red-600">Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {invoice.validationErrors.map((error, index) => (
                      <div key={index} className="text-sm p-3 bg-red-50 rounded-md">
                        <span className="font-medium text-red-800">{error.field}:</span>
                        <span className="text-red-700 ml-2">{error.message}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
