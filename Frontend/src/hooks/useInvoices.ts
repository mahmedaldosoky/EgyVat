import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { CreateInvoiceRequest } from '@/lib/types'

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: api.getInvoices,
  })
}

export function useInvoice(invoiceNumber: string) {
  return useQuery({
    queryKey: ['invoices', invoiceNumber],
    queryFn: () => api.getInvoice(invoiceNumber),
    enabled: !!invoiceNumber,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateInvoiceRequest) => api.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ invoiceNumber, action }: { invoiceNumber: string; action: string }) => 
      api.updateInvoiceStatus(invoiceNumber, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', variables.invoiceNumber] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: api.getDashboardStats,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}

export function useSearchInvoices(query: string) {
  return useQuery({
    queryKey: ['invoices', 'search', query],
    queryFn: () => api.searchInvoices(query),
    enabled: query.length > 0,
  })
}
