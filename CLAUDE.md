# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EgyVAT is an Egyptian VAT Invoice Management System designed for compliance with Egyptian Tax Authority (ETA) regulations. The system consists of:

- **Frontend**: React/TypeScript web application for invoice management UI
- **Backend**: AWS Lambda functions for invoice processing and ETA integration
- **Shared Library**: Common models, validation, and ETA API integration

## Architecture

### Backend Services (AWS Lambda + DynamoDB)
- **InvoiceGenerator** (`InvoiceGenerator/`): Creates and validates invoices, handles ETA submission workflow
- **InvoiceRetriever** (`InvoiceRetriever/`): Retrieves and queries invoices from DynamoDB
- **ReportGenerator** (`ReportGenerator/`): Generates VAT reports and tax compliance summaries
- **Shared** (`Shared/`): Contains common models, ETA validation rules, and API integration

### Frontend (`Frontend/`)
- React 18 + TypeScript SPA with routing
- Uses shadcn/ui components with Tailwind CSS styling
- TanStack Query for API state management
- React Hook Form + Zod for form validation
- VAT Reports page with Excel/PDF export capabilities

### Data Storage
- DynamoDB table with partition key (InvoiceNumber) and sort key (SK = "INVOICE")
- GSI1 for customer-based queries: `CUSTOMER#{TaxNumber}` → `INVOICE#{InvoiceNumber}`
- GSI2 for status-based queries: `STATUS#{Status}` → `DATE#{CreatedAt}#{InvoiceNumber}`

## Development Commands

### Frontend Development
```bash
cd Frontend
npm install                    # Install dependencies
npm run dev                   # Start development server (http://localhost:5173)
npm run build                 # Build for production (TypeScript + Vite)
npm run lint                  # ESLint validation
npm run preview               # Preview production build
```

### Backend Development (.NET 8)
```bash
# Build entire solution
dotnet build EgyVAT.sln

# Test specific project
dotnet build InvoiceGenerator/
dotnet build InvoiceRetriever/
dotnet build Shared/

# Run in Debug/Release mode
dotnet build -c Debug
dotnet build -c Release
```

## ETA Integration

The system implements Egyptian Tax Authority workflows:

### Invoice Statuses
1. **Draft** → **Validated** → **Submitting** → **Submitted** → **Valid/Invalid**
2. **Draft** → **Cancelled** (before submission)
3. **Valid** → **Cancelled** (requires ETA cancellation)

### Environment Modes
- **Demo Mode**: Set `ENVIRONMENT=demo` or `ETA_CLIENT_ID=DEMO_MODE` for simulation
- **Production Mode**: Requires real ETA credentials (`ETA_CLIENT_ID`, `ETA_CLIENT_SECRET`)

### Key Environment Variables
- `TABLE_NAME`: DynamoDB table name (default: "EgyVAT-Invoices")
- `SUPPLIER_NAME`, `SUPPLIER_TAX_NUMBER`, `SUPPLIER_ADDRESS`: Company details
- `ETA_API_URL`: ETA API endpoint
- `ETA_CLIENT_ID`, `ETA_CLIENT_SECRET`: ETA API credentials

## Key Files

### Backend Core Files
- `InvoiceGenerator/InvoiceGenerator.cs`: Main invoice creation and ETA submission logic
- `InvoiceRetriever/InvoiceRetriever.cs`: Invoice querying and retrieval
- `Shared/Models.cs`: Core data models (`EgyptianInvoice`, `CustomerInfo`, etc.)
- `Shared/EgyptianTaxValidator.cs`: ETA compliance validation rules
- `Shared/ETAApiService.cs`: ETA API integration service

### Frontend Core Files
- `Frontend/src/App.tsx`: Main application routing
- `Frontend/src/pages/`: Dashboard, InvoicesList, CreateInvoice, InvoiceDetails, Reports
- `Frontend/src/hooks/useInvoices.ts`: API integration hooks
- `Frontend/src/hooks/useReports.ts`: Report-specific API hooks
- `Frontend/src/lib/api.ts`: Backend API client configuration

## Invoice Creation Patterns

### New Format (Frontend)
```typescript
{
  customer: { name, address, taxNumber },
  issueDate: "YYYY-MM-DD",
  lines: [{ description, quantity, unitPrice, taxRate }]
}
```

### Legacy Format (API)
```typescript
{
  customerName, customerTaxNumber, customerAddress,
  itemDescription, quantity, unitPrice, discountRate
}
```

## Validation Rules

The system enforces Egyptian tax regulations:
- Customer tax numbers: 9 digits for B2B
- National IDs: 14 digits for B2C customers  
- Standard VAT rate: 14%
- Required fields per ETA specifications
- Invoice numbering format compliance

## API Endpoints

Lambda functions expose API Gateway endpoints:

### Invoice Management
- `POST /invoices` - Create invoice
- `PUT /invoices/{invoiceNumber}` - Update invoice status (validate, submit, cancel)
- `GET /invoices` - List all invoices  
- `GET /invoices/{invoiceNumber}` - Get specific invoice

Actions: `validate`, `submit`, `resubmit`, `check_status`, `cancel`

### VAT Reporting
- `GET /reports/vat-summary?startDate=&endDate=` - Custom period VAT summary
- `GET /reports/monthly?year=&month=` - Monthly VAT report
- `GET /reports/quarterly?year=&quarter=` - Quarterly VAT report with breakdown