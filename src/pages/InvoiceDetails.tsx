import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, CheckCircle, XCircle, AlertCircle, Send, RefreshCw, Ban } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useInvoice, useUpdateInvoiceStatus } from '@/hooks/useInvoices'
import { formatCurrency, formatDate } from '@/lib/utils'
import { generatePDF } from '@/lib/pdfGenerator'
import { useToast } from '@/hooks/useToast'

export function InvoiceDetails() {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: invoice, isLoading, error, refetch } = useInvoice(invoiceNumber || '')
  const updateStatusMutation = useUpdateInvoiceStatus()

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, any> = {
      draft: { variant: 'outline', icon: null, color: 'text-gray-600' },
      validated: { variant: 'default', icon: CheckCircle, color: 'text-blue-600' },
      submitting: { variant: 'outline', icon: RefreshCw, color: 'text-yellow-600' },
      submitted: { variant: 'default', icon: Send, color: 'text-indigo-600' },
      valid: { variant: 'success', icon: CheckCircle, color: 'text-green-600' },
      invalid: { variant: 'danger', icon: XCircle, color: 'text-red-600' },
      cancelled: { variant: 'outline', icon: Ban, color: 'text-gray-500' },
      rejected: { variant: 'danger', icon: XCircle, color: 'text-red-700' }
    }
        
    const config = statusConfig[status?.toLowerCase() || 'draft'] || statusConfig.draft
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className={`${config.color} flex items-center gap-1`}>
        {Icon && <Icon className="h-3 w-3" />}
        {status?.toUpperCase() || 'DRAFT'}
      </Badge>
    )
  }

  const handleAction = async (action: string) => {
    if (!invoiceNumber) return
    
    try {
      await updateStatusMutation.mutateAsync({ invoiceNumber, action })
      await refetch()
      
      // Show success message based on action
      const messages: Record<string, string> = {
        validate: 'Invoice validated successfully',
        submit: 'Invoice submitted to ETA',
        resubmit: 'Invoice resubmitted to ETA',
        check_status: 'Status updated from ETA',
        cancel: 'Invoice cancelled'
      }
      showToast(messages[action] || 'Action completed', 'success')
    } catch (error: any) {
      const errorMessage = error?.message || 'Action failed. Please try again.'
      showToast(errorMessage, 'error')
    }
  }
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
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
    // vatRate is stored as percentage (14 for 14%), not decimal
    const vatRate = line.vatRate || line.taxRate || 14
    const taxRate = vatRate / 100 // Convert to decimal for calculation
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
                {getStatusBadge(invoice.status)}
              </div>
              <div className="text-slate-600 text-sm">
                {formatDate(invoice.issueDateTime)}
                {invoice.etaLongId && (
                  <span className="ml-3">ETA ID: {invoice.etaLongId}</span>
                )}
              </div>
            </div>            
            {/* Action Buttons Based on Status */}
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline"
                onClick={() => generatePDF(invoice)}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                PDF
              </Button>
              
              {/* Status-specific actions */}
              {(invoice.status?.toLowerCase() === 'draft') && (
                <Button 
                  onClick={() => handleAction('validate')}
                  disabled={updateStatusMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Validate
                </Button>
              )}
              
              {(invoice.status?.toLowerCase() === 'validated') && (
                <Button 
                  onClick={() => handleAction('submit')}
                  disabled={updateStatusMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit to ETA
                </Button>
              )}              
              {(invoice.status?.toLowerCase() === 'submitted') && (
                <Button 
                  onClick={() => handleAction('check_status')}
                  disabled={updateStatusMutation.isPending}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Status
                </Button>
              )}
              
              {(invoice.status?.toLowerCase() === 'invalid') && (
                <>
                  <Button 
                    onClick={() => navigate(`/invoices/${invoice.invoiceNumber}/edit`)}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    Fix Errors
                  </Button>
                  <Button 
                    onClick={() => handleAction('resubmit')}
                    disabled={updateStatusMutation.isPending}
                    variant="outline"
                  >
                    Resubmit
                  </Button>
                </>
              )}
              
              {(['draft', 'validated', 'valid'].includes(invoice.status?.toLowerCase() || '')) && (
                <Button                   onClick={() => handleAction('cancel')}
                  disabled={updateStatusMutation.isPending}
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Validation/Rejection Errors */}
        {((invoice.validationErrors && invoice.validationErrors.length > 0) || 
          (invoice.etaRejectionReasons && invoice.etaRejectionReasons.length > 0)) && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-semibold mb-2">
                {invoice.status === 'invalid' ? 'ETA Rejection Reasons:' : 'Validation Errors:'}
              </div>
              <ul className="list-disc list-inside space-y-1">
                {(invoice.etaRejectionReasons || invoice.validationErrors || []).map((error: any, idx: number) => (
                  <li key={idx} className="text-sm">
                    {typeof error === 'string' ? error : error.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Supplier</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{invoice.supplier?.name}</p>
                  <p className="text-sm text-slate-600">{invoice.supplier?.address}</p>
                  <p className="text-sm text-slate-500">Tax: {invoice.supplier?.taxNumber}</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Customer</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{invoice.customer?.name}</p>
                  <p className="text-sm text-slate-600">{invoice.customer?.address}</p>
                  {invoice.customer?.taxNumber && (
                    <p className="text-sm text-slate-500">Tax: {invoice.customer.taxNumber}</p>
                  )}
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
                  {lines.map((line, index) => (
                    <div key={index} className="flex justify-between items-start p-4 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{line.description}</h4>
                        <p className="text-sm text-slate-600">
                          {line.quantity} × {formatCurrency(line.unitPrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(line.quantity * line.unitPrice)}</p>
                        <p className="text-sm text-slate-500">+{line.vatRate || 14}% VAT</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-md sticky top-4">              <CardHeader>
                <CardTitle className="text-xl">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">VAT (14%)</span>
                  <span className="font-medium">{formatCurrency(totalTax)}</span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-lg font-semibold text-brand-600">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
                
                {/* ETA Information */}
                {invoice.etaSubmissionDate && (
                  <div className="pt-4 border-t space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Submitted</span>
                      <span>{formatDate(invoice.etaSubmissionDate)}</span>
                    </div>
                    {invoice.etaAcceptanceDate && (                      <div className="flex justify-between">
                        <span className="text-slate-600">Accepted</span>
                        <span>{formatDate(invoice.etaAcceptanceDate)}</span>
                      </div>
                    )}
                    {invoice.submissionAttempts && invoice.submissionAttempts > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Attempts</span>
                        <span>{invoice.submissionAttempts}/3</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}