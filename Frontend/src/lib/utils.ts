import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP'
  }).format(amount)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A'
  }
  
  const dateObj = date instanceof Date ? date : new Date(date)
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date'
  }
  
  return new Intl.DateTimeFormat('en-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(dateObj)
}
