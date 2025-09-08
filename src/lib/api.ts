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

  const data = await response.json()
  const parsedData = data.body ? JSON.parse(data.body) : data

  if (!response.ok) {
    // Extract specific error messages from API response
    const errorMessage = parsedData.message || `API Error: ${response.statusText}`
    const errorDetails = parsedData.errors || []
    
    // Create a detailed error message
    const fullErrorMessage = errorDetails.length > 0 
      ? `${errorMessage}: ${errorDetails.join(', ')}`
      : errorMessage
    
    throw new ApiError(response.status, fullErrorMessage)
  }

  return parsedData
}

async function getInvoicesHelper(): Promise<Invoice[]> {
  const response = await fetchApi('/invoices')
  return response.data?.invoices || response.data || response
}

export const api = {
  // Invoice operations - connected to your Lambda functions
  async getInvoices(): Promise<Invoice[]> {
    return getInvoicesHelper()
  },

  async getInvoice(invoiceNumber: string): Promise<Invoice> {
    // GET /invoices/{invoiceNumber} -> EgyVAT-InvoiceRetriever
    const response = await fetchApi(`/invoices/${encodeURIComponent(invoiceNumber)}`)
    return response.data || response // Handle both wrapped and unwrapped responses
  },

  async createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
    // POST /invoices -> EgyVAT-InvoiceGenerator
    const response = await fetchApi('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data || response
  },

  async updateInvoice(invoiceNumber: string, data: Partial<Invoice>): Promise<Invoice> {
    // PUT /invoices/{invoiceNumber} -> EgyVAT-InvoiceGenerator
    return fetchApi(`/invoices/${encodeURIComponent(invoiceNumber)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async updateInvoiceStatus(invoiceNumber: string, action: string): Promise<Invoice> {
    // PUT /invoices/{invoiceNumber} -> EgyVAT-InvoiceGenerator with action
    return fetchApi(`/invoices/${encodeURIComponent(invoiceNumber)}`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    })
  },

  // Dashboard stats - derived from invoice data
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const invoices = await getInvoicesHelper()
      
      // Calculate stats from invoice data
      const totalInvoices = invoices.length
      
      // Check for both 'Valid' and 'Validated' statuses (case-insensitive)
      const validatedInvoices = invoices.filter(inv => {
        const status = inv.status?.toLowerCase()
        return status === 'valid' || status === 'validated'
      }).length
      
      const pendingInvoices = invoices.filter(inv => {
        const status = inv.status?.toLowerCase()
        return status === 'submitted' || status === 'draft' || status === 'submitting'
      }).length
      
      // Calculate total revenue from valid/validated invoices
      const totalRevenue = invoices
        .filter(inv => {
          const status = inv.status?.toLowerCase()
          return status === 'valid' || status === 'validated'
        })
        .reduce((sum, inv) => {
          if (!inv.lines || !Array.isArray(inv.lines)) return sum
          
          const invoiceTotal = inv.lines.reduce((lineSum, line) => {
            // Handle missing or invalid data
            const quantity = line.quantity || 0
            const unitPrice = line.unitPrice || 0
            const discountAmount = line.discountAmount || 0
            const vatRate = line.vatRate || 14 // Default 14% VAT in Egypt
            
            // Calculate line total: (quantity * unitPrice) - discountAmount + VAT
            const lineSubtotal = (quantity * unitPrice) - discountAmount
            const vatAmount = lineSubtotal * (vatRate / 100)
            
            return lineSum + lineSubtotal + vatAmount
          }, 0)
          
          return sum + invoiceTotal
        }, 0)

      console.log('Total revenue:', totalRevenue)

      const stats = {
        totalInvoices,
        totalRevenue,
        paidInvoices: validatedInvoices, // Using validated as "paid" for now
        pendingInvoices
      }
      
      console.log('Final stats:', stats)
      return stats
    } catch (error) {
      console.error('Error calculating dashboard stats:', error)
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
    const invoices = await getInvoicesHelper()
    const lowerQuery = query.toLowerCase()
    
    return invoices.filter(invoice =>
      invoice.invoiceNumber.toLowerCase().includes(lowerQuery) ||
      invoice.customer.name.toLowerCase().includes(lowerQuery)
    )
  },
}