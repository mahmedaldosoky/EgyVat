import { z } from "zod"

// Egyptian Tax Authority validation rules
export const egyptianTaxNumberSchema = z
  .string()
  .regex(/^\d{9}$/, "Egyptian Tax Number must be exactly 9 digits")

export const egyptianActivityCodeSchema = z
  .string()
  .regex(/^\d{5}$/, "Activity Code must be exactly 5 digits")

export const invoiceLineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  taxRate: z.number().min(0).max(1, "Tax rate must be between 0 and 100%").default(0.14), // 14% Egyptian VAT
})

export const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  taxNumber: egyptianTaxNumberSchema,
  activityCode: egyptianActivityCodeSchema.optional(),
})

export const createInvoiceSchema = z.object({
  customer: companySchema,
  lines: z.array(invoiceLineSchema).min(1, "At least one line item is required"),
  issueDate: z.string().refine((date) => {
    const invoiceDate = new Date(date)
    const today = new Date()
    return invoiceDate <= today
  }, "Invoice date cannot be in the future")
})

export type CreateInvoiceFormData = z.infer<typeof createInvoiceSchema>
export type InvoiceLineFormData = z.infer<typeof invoiceLineSchema>
export type CompanyFormData = z.infer<typeof companySchema>
