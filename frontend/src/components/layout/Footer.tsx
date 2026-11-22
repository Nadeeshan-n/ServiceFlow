import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import { ThemeToggle } from '../ThemeToggle'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-paper text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-docket bg-signal px-2 py-1 text-xs font-bold text-ink">SF</span>
              <span className="text-base font-bold">ServiceFlow</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Clear steps. Better service. Connecting people with trusted local service providers across Sri Lanka.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide">Quick Links</h4>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li><Link to="/companies" className="hover:text-foreground transition">Find a service</Link></li>
              <li><Link to="/client" className="hover:text-foreground transition">My Dashboard</Link></li>
              <li><Link to="/client/requests" className="hover:text-foreground transition">My Requests</Link></li>
              <li><Link to="/client/invoices" className="hover:text-foreground transition">My Invoices</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide">For Providers</h4>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li><Link to="/register" className="hover:text-foreground transition">Become a Provider</Link></li>
              <li><Link to="/login" className="hover:text-foreground transition">Provider Sign In</Link></li>
              <li><Link to="/style-guide" className="hover:text-foreground transition">Component Guide</Link></li>
              <li><Link to="/#how-it-works" className="hover:text-foreground transition">How it works</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide">Contact</h4>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li className="flex items-center gap-2"><Mail size={14} /> serviceflow@gmail.com</li>
              <li className="flex items-center gap-2"><Phone size={14} /> +94 11 234 5678</li>
              <li className="flex items-center gap-2"><MapPin size={14} /> Colombo, Sri Lanka</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3 text-xs text-text-secondary">
          <p>© {new Date().getFullYear()} ServiceFlow. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer