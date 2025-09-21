import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  FileText, 
  Plus, 
  Building2,
  ChevronRight,
  Settings,
  User,
  Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Create Invoice', href: '/invoices/create', icon: Plus },
]

export function Layout({ children }: LayoutProps) {
  const location = useLocation()

  // Get current page name for breadcrumb
  const getCurrentPageName = () => {
    const currentNav = navigation.find(item => item.href === location.pathname)
    return currentNav?.name || 'Dashboard'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Premium Navigation */}
      <nav className="nav-premium sticky top-0 z-50">
        <div className="nav-premium-content">
          <div className="flex justify-between h-16">
            {/* Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="h-10 w-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3">
                  <span className="text-xl font-bold text-slate-900 tracking-tight">
                    EgyVAT
                  </span>
                  <div className="text-xs text-slate-500 font-medium tracking-wide">
                    ENTERPRISE SUITE
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="hidden lg:ml-8 lg:flex lg:space-x-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-brand-50 text-brand-700 border border-brand-200 shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      )}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors duration-200">
                <Bell className="h-5 w-5" />
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors duration-200">
                <Settings className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-slate-900">EgyVAT Solutions</div>
                  <div className="text-xs text-slate-500">Administrator</div>
                </div>
                <div className="h-8 w-8 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-12">
            <nav className="flex items-center space-x-2 text-sm">
              <Link to="/" className="text-slate-500 hover:text-slate-700 transition-colors duration-200">
                Home
              </Link>
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <span className="font-medium text-slate-900">{getCurrentPageName()}</span>
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main>
        {children}
      </main>

      {/* Premium Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-500">
                © 2025 EgyVAT Solutions Ltd. Enterprise Edition.
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200">
                Licensed
              </span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-slate-500">
              <a href="#" className="hover:text-slate-700 transition-colors duration-200">Support</a>
              <a href="#" className="hover:text-slate-700 transition-colors duration-200">Documentation</a>
              <a href="#" className="hover:text-slate-700 transition-colors duration-200">Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}