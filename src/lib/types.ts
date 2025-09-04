export interface Invoice {
  uuid: string
  invoiceNumber: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  issueDateTime: string
  createdAt: string
  currency: string
  exchangeRate: number
  documentType: string
  documentTypeVersion: string
  supplier: Company
  customer: Company
  lines: InvoiceLine[]
  validationErrors?: ValidationError[]
}

export interface Company {
  name: string
  address: string
  taxNumber: string
  activityCode?: string
}

export interface InvoiceLine {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  amount: number
}

export interface ValidationError {
  field: string
  message: string
}

export interface CreateInvoiceRequest {
  customer: Company
  lines: InvoiceLine[]
  issueDate: string
}

export interface DashboardStats {
  totalInvoices: number
  totalRevenue: number
  paidInvoices: number
  pendingInvoices: number
}
