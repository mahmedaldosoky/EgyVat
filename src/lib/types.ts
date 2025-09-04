export interface Invoice {
  uuid: string
  invoiceNumber: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'validated' // Added 'validated'
  issueDateTime: string
  createdAt: string
  currency: string
  exchangeRate: number
  documentType: string
  documentTypeVersion: string
  supplier: Supplier
  customer: Customer
  lines: InvoiceLine[]
  validationErrors?: ValidationError[]
}

export interface Supplier {
  name: string
  taxNumber: string
  address: string
  activityCode: string
  branchId: string
}

export interface Customer {
  name: string
  taxNumber?: string
  nationalId?: string // For B2C customers
  address?: string
  type: 'b2B' | 'b2C'
}

// Legacy Company interface for backward compatibility
export interface Company {
  name: string
  address: string
  taxNumber: string
  activityCode?: string
}

export interface InvoiceLine {
  description: string
  itemCode?: string // Made optional for form compatibility
  gS1Code?: string // Made optional for form compatibility
  unitType?: string // Made optional for form compatibility
  quantity: number
  unitPrice: number
  discountRate?: number // Made optional for form compatibility
  discountAmount?: number // Made optional for form compatibility
  vatRate?: number // Made optional for form compatibility
  taxRate?: number // For form compatibility
  taxItems?: any[] // Made optional for form compatibility
  // Legacy field for backward compatibility
  amount?: number
}

export interface ValidationError {
  field: string
  message: string
}

export interface CreateInvoiceRequest {
  customer: Company
  lines: InvoiceLine[] // Now compatible with form data
  issueDate: string
}

export interface DashboardStats {
  totalInvoices: number
  totalRevenue: number
  paidInvoices: number
  pendingInvoices: number
}