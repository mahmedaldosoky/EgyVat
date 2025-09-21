import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-deloitte-950 text-white",
        success: "border-transparent bg-success-100 text-success-800",
        validated: "border-transparent bg-brand-100 text-brand-800",
        pending: "border-transparent bg-warning-100 text-warning-800",
        draft: "border-transparent bg-deloitte-100 text-deloitte-700",
        warning: "border-transparent bg-warning-100 text-warning-800",
        danger: "border-transparent bg-error-100 text-error-800",
        outline: "text-deloitte-700 border-deloitte-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
