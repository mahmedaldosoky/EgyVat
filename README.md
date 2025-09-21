# EgyVAT - Egyptian VAT Invoice Management System

A full-stack application for managing Egyptian VAT-compliant invoices with AWS Lambda backend and React frontend.

## Project Structure

```
EgyVAT/
├── Frontend/                 # React/TypeScript frontend
├── InvoiceGenerator/         # AWS Lambda function
├── InvoiceRetriever/         # AWS Lambda function  
├── ReportGenerator/          # AWS Lambda function
├── Shared/                   # Common .NET libraries
├── deploy-aws-cli.bat        # AWS deployment script
├── deploy-to-lambda.bat      # Lambda deployment script
└── EgyVAT.sln               # .NET solution file
```

## Quick Start

### Frontend Development
```bash
cd Frontend
npm install
npm run dev
```
Visit http://localhost:5173

### Backend Development
```bash
# Build all lambda functions
dotnet build EgyVAT.sln

# Deploy to AWS (requires AWS CLI configured)
./deploy-aws-cli.bat
```

## Components

### Frontend
- **Tech Stack**: React 18, TypeScript, Vite, TanStack Query, shadcn/ui
- **Features**: Invoice management, dashboard, Egyptian VAT compliance
- **Location**: `/Frontend`

### Backend (AWS Lambda)
- **InvoiceGenerator**: Creates new VAT invoices
- **InvoiceRetriever**: Fetches existing invoices  
- **ReportGenerator**: Generates VAT reports
- **Language**: C# .NET
- **Deployment**: AWS Lambda via AWS CLI

## Development Workflow

1. **Frontend**: Develop in `/Frontend` with hot reload
2. **Backend**: Test locally with .NET CLI, deploy to AWS
3. **Integration**: Update API endpoints in `Frontend/src/lib/api.ts`

## Deployment

### Frontend
Deploy to your preferred hosting (Vercel, Netlify, S3, etc.)

### Backend  
Use provided deployment scripts:
```bash
# Deploy all functions
./deploy-aws-cli.bat

# Or specific function
./deploy-to-lambda.bat
```

## Requirements

- Node.js 18+ (Frontend)
- .NET 6+ SDK (Backend)
- AWS CLI configured (Deployment)

## Environment Setup

1. Configure AWS credentials
2. Update lambda function URLs in frontend API configuration
3. Set up any required environment variables

## Documentation

- Frontend details: `/Frontend/README.md`
- Reports documentation: `/REPORTS_README.md`
