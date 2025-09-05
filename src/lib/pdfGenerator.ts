import { Invoice } from './types'
import { formatCurrency, formatDate } from './utils'

// Safe date formatter for PDF generation
function safeFormatDate(date: string | Date | null | undefined): string {
  try {
    return formatDate(date)
  } catch {
    return 'N/A'
  }
}

export function generatePDF(invoice: Invoice) {
  if (!invoice) {
    alert('Invalid invoice data')
    return
  }
  // Create a new window with the invoice content
  const printWindow = window.open('', '', 'height=800,width=800')
  
  if (!printWindow) {
    alert('Please allow popups to download the PDF')
    return
  }

  const lines = invoice.lines || []
  const subtotal = lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0)
  const totalTax = lines.reduce((sum, line) => {
    const taxRate = line.taxRate || line.vatRate || 0.14
    return sum + (line.quantity * line.unitPrice * taxRate)
  }, 0)
  const total = subtotal + totalTax

  // Generate the HTML content for the PDF with Deloitte theme
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', 'Helvetica Neue', sans-serif;
          color: #000000;
          padding: 40px;
          background: white;
          line-height: 1.4;
        }
        
        .invoice-header {
          background: #000000;
          color: white;
          padding: 35px;
          margin: -40px -40px 40px -40px;
          position: relative;
          border-bottom: 4px solid #86BC25;
        }
        
        .deloitte-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #86BC25;
          border-radius: 50%;
          margin-right: 12px;
          vertical-align: middle;
        }
        
        .invoice-title {
          font-size: 36px;
          font-weight: 300;
          margin-bottom: 8px;
          letter-spacing: 1px;
          font-family: 'Arial', sans-serif;
        }
        
        .invoice-subtitle {
          font-size: 14px;
          opacity: 0.85;
          font-weight: 300;
          letter-spacing: 0.5px;
        }
        
        .invoice-number {
          font-size: 16px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.2);
          font-weight: 400;
        }
        
        .invoice-meta {
          display: flex;
          justify-content: space-between;
          margin: 40px 0;
          padding: 0;
          background: transparent;
        }
        
        .meta-item {
          text-align: left;
          padding: 20px;
          background: #f8f8f8;
          border-left: 3px solid #86BC25;
          flex: 1;
          margin-right: 15px;
        }
        
        .meta-item:last-child {
          margin-right: 0;
        }
        
        .meta-label {
          font-size: 11px;
          color: #62666A;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          font-weight: 600;
        }
        
        .meta-value {
          font-size: 16px;
          font-weight: 400;
          color: #000000;
        }
        
        .parties {
          display: flex;
          justify-content: space-between;
          margin: 40px 0;
          gap: 40px;
        }
        
        .party {
          flex: 1;
          padding: 25px;
          background: white;
          border: 1px solid #e0e0e0;
          position: relative;
        }
        
        .party::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: #86BC25;
        }
        
        .party-label {
          font-size: 11px;
          color: #62666A;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 20px;
          font-weight: 600;
        }
        
        .party-name {
          font-size: 20px;
          font-weight: 400;
          color: #000000;
          margin-bottom: 15px;
          line-height: 1.2;
        }
        
        .party-details {
          font-size: 14px;
          color: #62666A;
          line-height: 1.6;
          font-weight: 400;
        }
        
        .items-table {
          width: 100%;
          margin: 40px 0;
          border-collapse: collapse;
          border: 1px solid #e0e0e0;
          background: white;
        }
        
        .items-table thead {
          background: #000000;
          color: white;
        }
        
        .items-table th {
          padding: 18px 15px;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
          border-right: 1px solid rgba(255,255,255,0.1);
        }
        
        .items-table th:last-child {
          text-align: right;
          border-right: none;
        }
        
        .items-table td {
          padding: 18px 15px;
          border-bottom: 1px solid #e0e0e0;
          border-right: 1px solid #e0e0e0;
          font-size: 14px;
          color: #000000;
          font-weight: 400;
        }
        
        .items-table td:last-child {
          text-align: right;
          font-weight: 500;
          border-right: none;
        }
        
        .items-table tbody tr:nth-child(even) {
          background: #fafafa;
        }
        
        .items-table tbody tr:hover {
          background: #f0f8f0;
        }
        
        .totals {
          margin-top: 40px;
          padding: 30px;
          background: #f8f8f8;
          border-left: 4px solid #86BC25;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          font-size: 15px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .total-row:last-child {
          border-bottom: none;
        }
        
        .total-row.final {
          margin-top: 20px;
          padding: 20px 0 0 0;
          border-top: 2px solid #000000;
          border-bottom: none;
          font-size: 22px;
          font-weight: 500;
          color: #000000;
        }
        
        .total-label {
          color: #62666A;
          font-weight: 400;
        }
        
        .total-row.final .total-label {
          color: #000000;
          font-weight: 500;
        }
        
        .footer {
          margin-top: 60px;
          padding-top: 30px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
          color: #62666A;
          font-size: 12px;
          position: relative;
        }
        
        .footer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 2px;
          background: #86BC25;
        }
        
        .footer-logo {
          font-size: 16px;
          font-weight: 500;
          color: #000000;
          margin-bottom: 15px;
          letter-spacing: 0.5px;
        }
        
        .footer p {
          margin: 5px 0;
          font-weight: 300;
        }
        
        .status-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 0;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          background: #86BC25;
          color: white;
          border: none;
        }
        
        .status-badge.draft {
          background: #62666A;
        }
        
        .status-badge.paid {
          background: #86BC25;
        }
        
        .status-badge.pending {
          background: #ff6b35;
        }
        
        /* Deloitte-style accent elements */
        .accent-line {
          height: 2px;
          background: linear-gradient(90deg, #86BC25 0%, #00A651 100%);
          margin: 20px 0;
        }
        
        .highlight-text {
          color: #86BC25;
          font-weight: 500;
        }
        
        @media print {
          body {
            padding: 20px;
          }
          .invoice-header {
            margin: -20px -20px 30px -20px;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .items-table thead {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .totals {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .status-badge {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .meta-item {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-header">
        <div class="invoice-title">
          <span class="deloitte-dot"></span>TAX INVOICE
        </div>
        <div class="invoice-subtitle">Professional Services • Egyptian Electronic Invoice System</div>
        <div class="invoice-number">
          Invoice #${invoice.invoiceNumber || 'N/A'}
          <span class="status-badge ${(invoice.status || 'draft').toLowerCase()}" style="margin-left: 20px;">${(invoice.status || 'draft').toUpperCase()}</span>
        </div>
      </div>
      
      <div class="invoice-meta">
        <div class="meta-item">
          <div class="meta-label">Issue Date</div>
          <div class="meta-value">${safeFormatDate(invoice.issueDateTime)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Document Type</div>
          <div class="meta-value">${invoice.documentType || 'Standard Invoice'}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Currency</div>
          <div class="meta-value">${invoice.currency || 'EGP'}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Exchange Rate</div>
          <div class="meta-value">${invoice.exchangeRate || '1.00'}</div>
        </div>
      </div>
      
      <div class="parties">
        <div class="party">
          <div class="party-label">Supplier Details</div>
          <div class="party-name">${invoice.supplier?.name || 'N/A'}</div>
          <div class="party-details">
            ${invoice.supplier?.address || 'N/A'}<br>
            <strong>Tax Number:</strong> ${invoice.supplier?.taxNumber || 'N/A'}<br>
            ${invoice.supplier?.activityCode ? `<strong>Activity Code:</strong> ${invoice.supplier.activityCode}` : ''}
          </div>
        </div>
        
        <div class="party">
          <div class="party-label">Customer Details</div>
          <div class="party-name">${invoice.customer?.name || 'N/A'}</div>
          <div class="party-details">
            ${invoice.customer?.address || 'N/A'}<br>
            ${invoice.customer?.taxNumber ? `<strong>Tax Number:</strong> ${invoice.customer.taxNumber}` : 'N/A'}<br>
            <strong>Type:</strong> ${invoice.customer?.type === 'b2B' ? 'Business Customer' : 'Individual Customer'}
          </div>
        </div>
      </div>
      
      <div class="accent-line"></div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: center;">Unit Price</th>
            <th style="text-align: center;">Tax Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lines.map(line => `
            <tr>
              <td><strong>${line.description}</strong></td>
              <td style="text-align: center;">${line.quantity}</td>
              <td style="text-align: center;">${formatCurrency(line.unitPrice)}</td>
              <td style="text-align: center;"><span class="highlight-text">${((line.taxRate || line.vatRate || 0.14) * 100).toFixed(0)}%</span></td>
              <td><strong>${formatCurrency(line.amount || (line.quantity * line.unitPrice))}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="totals">
        <div class="total-row">
          <span class="total-label">Subtotal</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">VAT (14%)</span>
          <span>${formatCurrency(totalTax)}</span>
        </div>
        <div class="total-row final">
          <span class="total-label">Total Amount</span>
          <span class="highlight-text">${formatCurrency(total)}</span>
        </div>
      </div>
      
      <div class="footer">
        <div class="footer-logo">EgyVAT System</div>
        <p>This is an electronically generated invoice</p>
        <p>Compliant with Egyptian Tax Authority regulations</p>
        <p style="margin-top: 15px; font-weight: 400;">Generated on ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
      </div>
    </body>
    </html>
  `

  // Write the content to the new window
  printWindow.document.write(htmlContent)
  printWindow.document.close()

  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
    printWindow.onafterprint = () => printWindow.close()
  }
}