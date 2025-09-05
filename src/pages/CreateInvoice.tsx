import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useCreateInvoice } from '@/hooks/useInvoices'
import { createInvoiceSchema, type CreateInvoiceFormData } from '@/lib/validations'

export function CreateInvoice() {
  const navigate = useNavigate()
  const createMutation = useCreateInvoice()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<CreateInvoiceFormData>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      issueDate: new Date().toISOString().split('T')[0],
      lines: [
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 0.14 // 14% Egyptian VAT
        }
      ]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines'
  })

  const watchedLines = watch('lines')

  const onSubmit = (data: CreateInvoiceFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        navigate('/invoices')
      }
    })
  }

  const calculateLineTotal = (index: number) => {
    const line = watchedLines[index]
    if (!line) return 0
    const subtotal = line.quantity * line.unitPrice
    const tax = subtotal * line.taxRate
    return subtotal + tax
  }

  const calculateGrandTotal = () => {
    return watchedLines.reduce((total, _, index) => total + calculateLineTotal(index), 0)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Create Invoice</h1>
          <p className="mt-2 text-slate-600">
            Create a new Egyptian VAT compliant invoice
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Information */}
          <div className="card-premium">
            <CardHeader className="card-premium-header">
              <CardTitle className="text-lg font-semibold text-slate-900">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="card-premium-content space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name *
                </label>
                <Input
                  {...register('customer.name')}
                  placeholder="Enter customer company name"
                  className="border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                />
                {errors.customer?.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.customer.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Address *
                </label>
                <Input
                  {...register('customer.address')}
                  placeholder="Enter customer address"
                  className="border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                />
                {errors.customer?.address && (
                  <p className="text-sm text-red-600 mt-1">{errors.customer.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tax Number (9 digits) *
                  </label>
                  <Input
                    {...register('customer.taxNumber')}
                    placeholder="123456789"
                    maxLength={9}
                    className="border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                  />
                  {errors.customer?.taxNumber && (
                    <p className="text-sm text-red-600 mt-1">{errors.customer.taxNumber.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Activity Code (5 digits)
                  </label>
                  <Input
                    {...register('customer.activityCode')}
                    placeholder="62010"
                    maxLength={5}
                    className="border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                  />
                  {errors.customer?.activityCode && (
                    <p className="text-sm text-red-600 mt-1">{errors.customer.activityCode.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </div>

          {/* Invoice Details */}
          <div className="card-premium">
            <CardHeader className="card-premium-header">
              <CardTitle className="text-lg font-semibold text-slate-900">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="card-premium-content">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Issue Date *
                </label>
                <Input
                  type="date"
                  {...register('issueDate')}
                  className="border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                />
                {errors.issueDate && (
                  <p className="text-sm text-red-600 mt-1">{errors.issueDate.message}</p>
                )}
              </div>
            </CardContent>
          </div>

          {/* Line Items */}
          <div className="card-premium">
            <CardHeader className="card-premium-header">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold text-slate-900">Line Items</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({
                    description: '',
                    quantity: 1,
                    unitPrice: 0,
                    taxRate: 0.14
                  })}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line
                </Button>
              </div>
            </CardHeader>
            <CardContent className="card-premium-content space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium text-slate-900">Line Item {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Description *
                      </label>
                      <Input
                        {...register(`lines.${index}.description`)}
                        placeholder="Item description"
                        className="border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                      />
                      {errors.lines?.[index]?.description && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.lines[index]?.description?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Quantity *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
                        placeholder="1"
                        className="border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                      />
                      {errors.lines?.[index]?.quantity && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.lines[index]?.quantity?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Unit Price (EGP) *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })}
                        placeholder="0.00"
                        className="border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                      />
                      {errors.lines?.[index]?.unitPrice && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.lines[index]?.unitPrice?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 text-right">
                    <p className="text-sm text-slate-600">
                      VAT (14%): EGP {(calculateLineTotal(index) * 0.14 / 1.14).toFixed(2)}
                    </p>
                    <p className="font-semibold text-slate-900">
                      Total: EGP {calculateLineTotal(index).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}

              {errors.lines && (
                <p className="text-sm text-red-600">{errors.lines.message}</p>
              )}
            </CardContent>
          </div>

          {/* Invoice Total */}
          <div className="card-premium">
            <CardContent className="card-premium-content">
              <div className="text-right space-y-2">
                <div className="text-2xl font-bold text-slate-900">
                  Grand Total: EGP {calculateGrandTotal().toFixed(2)}
                </div>
                <p className="text-sm text-slate-600">
                  VAT (14%) included: EGP {(calculateGrandTotal() * 0.14 / 1.14).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/invoices')}
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-brand-600 hover:bg-brand-700 text-white shadow-sm px-8"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>

          {createMutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-800">
                {(() => {
                  const errorMessage = createMutation.error.message || 'Error creating invoice. Please try again.'
                  
                  // Check if the error message contains multiple validation errors
                  if (errorMessage.includes(':') && errorMessage.includes(',')) {
                    const [title, errorsText] = errorMessage.split(': ', 2)
                    const errors = errorsText.split(', ')
                    
                    return (
                      <div>
                        <p className="font-medium mb-2">{title}</p>
                        <ul className="list-disc list-inside space-y-1">
                          {errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )
                  }
                  
                  return <p>{errorMessage}</p>
                })()}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}