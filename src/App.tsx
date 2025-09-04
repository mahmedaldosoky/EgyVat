import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { InvoicesList } from './pages/InvoicesList'
import { CreateInvoice } from './pages/CreateInvoice'
import { InvoiceDetails } from './pages/InvoiceDetails'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/invoices" element={<InvoicesList />} />
        <Route path="/invoices/create" element={<CreateInvoice />} />
        <Route path="/invoices/:invoiceNumber" element={<InvoiceDetails />} />
      </Routes>
    </Layout>
  )
}

export default App
