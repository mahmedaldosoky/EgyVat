import { Invoice, CreateInvoiceRequest, DashboardStats } from './types'

// Your real API Gateway URLs
const API_BASE = 'https://fflp22vkng.execute-api.eu-central-1.amazonaws.com/prod'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.statusText}`)
  }

  return response.json()
}

export const api = {
  // Invoice operations - connected to your Lambda functions
  async getInvoices(): Promise<Invoice[]> {
    // GET /invoices -> EgyVAT-InvoiceRetriever
    return fetchApi('/invoices')
  },

  async getInvoice(invoiceNumber: string): Promise<Invoice> {
    // GET /invoices/{invoiceNumber} -> EgyVAT-InvoiceRetriever
    return fetchApi(`/invoices/${encodeURIComponent(invoiceNumber)}`)
  },

  async createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
    // POST /invoices -> EgyVAT-InvoiceGenerator
    return fetchApi('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateInvoice(invoiceNumber: string, data: Partial<Invoice>): Promise<Invoice> {
    // PUT /invoices/{invoiceNumber} -> EgyVAT-InvoiceGenerator
    return fetchApi(`/invoices/${encodeURIComponent(invoiceNumber)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async updateInvoiceStatus(invoiceNumber: string, status: string): Promise<Invoice> {
    // PUT /invoices/{invoiceNumber} -> EgyVAT-InvoiceGenerator (update status only)
    return fetchApi(`/invoices/${encodeURIComponent(invoiceNumber)}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  },

  // Dashboard stats - derived from invoice data
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const invoices = await this.getInvoices()
      
      // Calculate stats from invoice data
      const totalInvoices = invoices.length
      const paidInvoices = invoices.filter(inv => inv.status === 'paid').length
      const pendingInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'draft').length
      const totalRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.lines.reduce((lineSum, line) => lineSum + line.amount, 0), 0)

      return {
        totalInvoices,
        totalRevenue,
        paidInvoices,
        pendingInvoices
      }
    } catch (error) {
      // Return default stats if API fails
      return {
        totalInvoices: 0,
        totalRevenue: 0,
        paidInvoices: 0,
        pendingInvoices: 0
      }
    }
  },

  // Search invoices - client-side filtering for now
  async searchInvoices(query: string): Promise<Invoice[]> {
    const invoices = await this.getInvoices()
    const lowerQuery = query.toLowerCase()
    
    return invoices.filter(invoice =>
      invoice.invoiceNumber.toLowerCase().includes(lowerQuery) ||
      invoice.customer.name.toLowerCase().includes(lowerQuery)
    )
  },
}
