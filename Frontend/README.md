# EgyVAT Frontend

Egyptian VAT Invoice Management System built with React, TypeScript, and Vite.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open http://localhost:5173

## Features

- Egyptian VAT compliant invoice management
- Dashboard with statistics
- Create and view invoices
- Real-time validation with Egyptian Tax Authority rules
- Modern UI with Blue/White theme and Green success states

## Tech Stack

- React 18 + TypeScript
- Vite for fast development
- TanStack Query for API state
- React Hook Form + Zod for validation
- shadcn/ui + Tailwind CSS for UI
- Lucide React for icons

## API Integration

Update `src/lib/api.ts` with your Lambda function URLs to connect to your AWS backend.
