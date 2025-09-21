# EgyVAT Basic Reporting Dashboard

## Overview
The Basic Reporting Dashboard has been added to provide essential VAT compliance reports for the Egyptian Tax Authority. This feature allows you to generate monthly, quarterly, and custom period reports with export capabilities.

## New Components

### Backend - ReportGenerator Lambda Function
- **Location**: `ReportGenerator/`
- **Purpose**: Aggregates invoice data and generates VAT reports
- **Endpoints**:
  - `GET /reports/vat-summary` - Custom period VAT summary
  - `GET /reports/monthly` - Monthly VAT report
  - `GET /reports/quarterly` - Quarterly VAT report with monthly breakdown

### Frontend - Reports Page
- **Location**: `Frontend/src/pages/Reports.tsx`
- **Features**:
  - Monthly/Quarterly/Custom period selection
  - VAT summary with total sales, VAT collected, and discounts
  - Invoice breakdown by status and type (B2B/B2C)
  - Export to Excel (XLSX) and PDF
  - Tax filing reminders and deadlines

## Setup Instructions

### 1. Backend Deployment

Deploy the ReportGenerator Lambda function to AWS:

```bash
cd ReportGenerator
dotnet lambda deploy-function EgyVAT-ReportGenerator
```

### 2. API Gateway Configuration

Add the following routes to your API Gateway:
- `GET /reports/vat-summary`
- `GET /reports/monthly`
- `GET /reports/quarterly`

Connect these routes to the `EgyVAT-ReportGenerator` Lambda function.

### 3. Frontend Setup

Install dependencies:
```bash
cd Frontend
npm install
```

The xlsx package has been added for Excel export functionality.

### 4. Environment Variables

The ReportGenerator uses the same DynamoDB table as other functions:
- `TABLE_NAME`: DynamoDB table name (default: "EgyVAT-Invoices")

## Usage

1. **Navigate to Reports**: Click "VAT Reports" in the navigation menu
2. **Select Period Type**: Choose Monthly, Quarterly, or Custom period
3. **Select Date Range**: Pick the year/month/quarter or custom dates
4. **View Summary**: The report will show:
   - Total sales before VAT
   - VAT collected (14% standard rate)
   - Net sales after discounts
   - Total invoice count
   - Breakdown by status and customer type
5. **Export Reports**: 
   - Click "Export Excel" for .xlsx file with detailed breakdown
   - Click "Export PDF" to print/save as PDF

## Report Features

### Monthly Report
- Complete VAT summary for selected month
- Invoice status breakdown
- Customer type analysis (B2B vs B2C)

### Quarterly Report
- Aggregate data for 3-month period
- Monthly breakdown showing trends
- Comprehensive VAT calculations

### Custom Period
- Flexible date range selection
- Useful for ad-hoc reporting
- Same detailed breakdown as other reports

## Tax Compliance Information

Each report includes:
- **VAT Return Due Date**: 15th of following month
- **VAT Payment Due Date**: End of following month
- **Total VAT Payable**: Calculated from validated invoices

## Technical Details

### Data Aggregation
- Reports are generated in real-time from DynamoDB
- Only validated/submitted invoices are included in VAT calculations
- Supports both B2B (9-digit tax number) and B2C (14-digit national ID) transactions

### Export Formats
- **Excel**: Full data export with multiple sheets
- **PDF**: Browser print-friendly format

### Performance
- Reports are cached for 5 minutes to reduce database load
- Efficient scanning with GSI optimization (future enhancement)

## Future Enhancements

Consider these improvements:
1. **GSI for Date Queries**: Add Global Secondary Index for faster date-based queries
2. **Scheduled Reports**: Automatic monthly report generation
3. **Email Delivery**: Send reports via email
4. **Comparative Analysis**: Year-over-year comparisons
5. **Graphical Charts**: Visual representations of data trends

## Testing

Test the reporting feature:
1. Create several test invoices with different statuses
2. Generate monthly report for current month
3. Export to Excel and verify calculations
4. Test quarterly report with multiple months of data
5. Verify VAT calculations match Egyptian tax requirements (14% standard rate)

## Notes

- Reports use the existing invoice data structure
- All amounts are in EGP (Egyptian Pounds)
- VAT rate is fixed at 14% as per Egyptian regulations
- Only invoices with status "Valid", "Validated", or "Submitted" are included in VAT calculations
