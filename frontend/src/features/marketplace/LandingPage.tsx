import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, Building2, CalendarCheck, Car, ClipboardCheck, ClipboardList,
  FileText, MapPin, PaintRoller, Plug, Search, ShieldCheck, Sparkles, Wrench, Zap,
} from 'lucide-react'
import { FlowAIPanel, StatusBadge, SurfaceCard, Tabs } from '../../components'
import { money, Resource, useResource } from '../../components/client-shared'
import { clientService } from '../../lib/client-service'
import { demoMode } from '../../lib/api'
import { destination, useSession } from '../../app/session'

const categories = [
  { name: 'Plumbing', icon: Wrench, keyword: 'plumb' },
  { name: 'Electrical', icon: Zap, keyword: 'electr' },
  { name: 'Cleaning', icon: Sparkles, keyword: 'clean' },
  { name: 'Vehicle Repairs', icon: Car, keyword: 'vehicle' },
  { name: 'Appliance Repair', icon: Plug, keyword: 'appliance' },
  { name: 'Painting', icon: PaintRoller, keyword: 'paint' },
] as const

const tickerItems = [
  'Browse providers without an account',
  'You approve the quotation first',
  'Jobs, invoices and policies in one place',
  'Flow AI answers from policy documents only',
]

const howSteps = {
  client: [
    { icon: Search, title: 'Browse and compare', text: 'Look through verified service providers by service, area, rating and starting price — no account needed to browse.' },
    { icon: FileText, title: 'Request and approve', text: 'Register, send a request and review the quotation. Work only starts after you approve the price and the proposed time.' },
    { icon: ClipboardCheck, title: 'Track to the invoice', text: 'Follow the job from your dashboard and find the invoice in the same place when the work is complete.' },
  ],
  provider: [
    { icon: Building2, title: 'Register and get approved', text: 'Create your company or individual provider account, add your services and service areas, and get verified by the platform.' },
    { icon: ClipboardList, title: 'Receive requests, send quotations', text: 'Client requests land in your inbox. Respond with a priced quotation and a proposed appointment.' },
    { icon: CalendarCheck, title: 'Manage jobs and your team', text: 'Schedule and assign jobs, track invoices, and let Flow AI answer questions from your uploaded policy documents.' },
  ],
} as const

type HowPath = keyof typeof howSteps

export function LandingPage() {
  const { user } = useSession()
  const navigate = useNavigate()
  const resource = useResource(() => clientService.companies())
  const companies = resource.data ?? []
  const [serviceQuery, setServiceQuery] = useState('')
  const [areaQuery, setAreaQuery] = useState('')
  const [howPath, setHowPath] = useState<HowPath>('client')

  const showcase = [...companies]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.completed_jobs ?? 0) - (a.completed_jobs ?? 0))
    .slice(0, 4)

  const startingPrice = (offers: typeof companies[number]['offerings']) => {
    const prices = offers.filter(offer => offer.active).map(offer => offer.starting_price)
    return prices.length ? Math.min(...prices) : null
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const query = [serviceQuery, areaQuery].map(part => part.trim()).filter(Boolean).join(' ')
    navigate(query ? `/companies?search=${encodeURIComponent(query)}` : '/companies')
  }

  return <>
    {/* Hero */}
    <section className="sf-landing-hero sf-dotgrid">
      <div>
        <p className="sf-eyebrow"><span />LOCAL EXPERTISE. CLEAR NEXT STEPS.</p>
        <h1 className="sf-display text-4xl font-bold md:text-6xl">
          Find a service provider<br />you can <span className="sf-marker">trust.</span>
        </h1>
        <p className="my-6 max-w-xl text-lg text-text-secondary">
          Browse verified local companies and individual providers, agree the price before work begins, and follow every step from request to invoice.
        </p>
        <form className="sf-landing-search" onSubmit={submitSearch} role="search" aria-label="Find a service provider">
          <label className="sf-landing-search-field">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Service</span>
            <input type="search" value={serviceQuery} onChange={event => setServiceQuery(event.target.value)} placeholder="Service — e.g. plumbing" />
          </label>
          <label className="sf-landing-search-field">
            <MapPin size={18} aria-hidden="true" />
            <span className="sr-only">Location</span>
            <input type="text" value={areaQuery} onChange={event => setAreaQuery(event.target.value)} placeholder="Location — e.g. Colombo" />
          </label>
          <button type="submit" className="sf-primary-link">Find Providers</button>
        </form>
        <div className="flex flex-wrap gap-4">
          {user
            ? <Link className="sf-secondary-link" to={destination(user)}>Go to your dashboard <ArrowRight size={16} /></Link>
            : <Link className="sf-secondary-link" to="/register">Join as a Provider <ArrowRight size={16} /></Link>}
        </div>
      </div>

      {/* Sample job ticket */}
      <div className="sf-hero-ticket-wrap">
        <SurfaceCard className="sf-hero-ticket p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="sf-mono text-[11px] text-text-secondary">SF-JOB-2087</p>
              <h2 className="sf-display mt-2 text-xl font-semibold">Plumbing Inspection</h2>
              <p className="mt-1 text-sm text-text-secondary">BrightFix · Client: Nimal Fernando</p>
            </div>
            <span className="sf-mono text-[11px] text-text-secondary">Sample preview</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge status="scheduled" />
            <StatusBadge status="unpaid" />
          </div>
          <dl className="sf-ticket-lines">
            <div><dt>Inspection fee</dt><dd className="sf-tabular">{money(2500)}</dd></div>
            <div><dt>Call-out</dt><dd className="sf-tabular">{money(500)}</dd></div>
            <div className="sf-ticket-total"><dt>Total</dt><dd className="sf-tabular">{money(3000)}</dd></div>
          </dl>
          <div className="sf-separator mt-4 flex items-end justify-between gap-3 pt-4">
            <div className="sf-barcode" aria-hidden="true" />
            <span className="sf-approval-stamp">Quotation approved ✓</span>
          </div>
        </SurfaceCard>
      </div>
    </section>

    {/* Dispatch ticker */}
    <div className="sf-ticker" aria-hidden="true">
      <div className="sf-ticker-track">
        {[...tickerItems, ...tickerItems].map((item, index) => (
          <span key={index}>{item}<span className="sf-ticker-sep">///</span></span>
        ))}
      </div>
    </div>

    {/* Categories */}
    <section className="sf-directory-section" aria-labelledby="landing-categories">
      <div className="sf-section-heading">
        <div>
          <p className="sf-eyebrow"><span />BROWSE BY SERVICE</p>
          <h2 id="landing-categories">What do you need done?</h2>
          <p>Start with a category — you will see the providers who offer it.</p>
        </div>
      </div>
      <div className="sf-category-grid">
        {categories.map(({ name, icon: Icon, keyword }) => {
          const count = companies.filter(company =>
            `${company.category} ${company.offerings.map(offer => offer.name).join(' ')}`.toLowerCase().includes(keyword)).length
          return <Link key={name} className="sf-category-card" to={`/companies?search=${encodeURIComponent(name)}`}>
            <Icon size={24} aria-hidden="true" />
            <span className="sf-display font-semibold">{name}</span>
            <span className="text-sm text-text-secondary">{count ? `${count} provider${count === 1 ? '' : 's'} listed` : 'Browse providers'}</span>
          </Link>
        })}
      </div>
    </section>

    {/* Provider showcase */}
    <section className="sf-directory-section" aria-labelledby="landing-providers">
      <div className="sf-section-heading">
        <div>
          <p className="sf-eyebrow"><span />VERIFIED PROVIDERS</p>
          <h2 id="landing-providers">Providers on ServiceFlow</h2>
          <p>Compare ratings, completed jobs and starting prices before you send a request.</p>
        </div>
        <span className="sf-directory-note">{demoMode ? 'Sample listings' : 'Live listings'}<br />Starting prices shown. Your quotation confirms the total.</span>
      </div>
      <Resource {...resource} retry={resource.reload}>
        {showcase.length ? <div className="sf-company-grid">
          {showcase.map((company, index) => {
            const price = startingPrice(company.offerings)
            const initials = company.name.split(' ').map(part => part[0]).slice(0, 2).join('')
            return <article key={company.id} className="sf-company-card">
              <div className={`sf-company-card-top sf-company-tone-${index % 3}`}>
                <span className="sf-company-symbol sf-display font-semibold" aria-hidden="true">{initials}</span>
                <span className="sf-mono">{company.category}</span>
                <ArrowUpRight size={20} className="ml-auto" />
              </div>
              <div className="sf-company-card-body">
                <div className="sf-company-location"><MapPin size={14} />{company.location}</div>
                <h3 className="flex items-center gap-2">
                  <Link to={`/companies/${company.id}`}>{company.name}</Link>
                  <span className="rounded-docket bg-graphite p-1 text-white" role="img" aria-label="Verified provider" title="Verified provider"><ShieldCheck size={15} aria-hidden="true" /></span>
                </h3>
                <p>{company.description}</p>
                <p className="mt-3 text-sm text-text-secondary">
                  <span className="text-signal-text" aria-hidden="true">★</span>{' '}
                  <span className="sf-tabular">{company.rating != null ? company.rating.toFixed(1) : 'New'}</span>
                  {' · '}<span className="sf-tabular">{company.completed_jobs ?? 0}</span> job{(company.completed_jobs ?? 0) === 1 ? '' : 's'} completed
                </p>
                <div className="sf-offering-tags">
                  {company.offerings.filter(offer => offer.active).slice(0, 3).map(offer => <span key={offer.id}>{offer.name}</span>)}
                </div>
                <div className="sf-company-card-bottom">
                  <div><small>STARTING FROM</small><strong>{price != null ? money(price) : 'Price on quotation'}</strong></div>
                  <Link className="sf-company-open" to={`/companies/${company.id}`} aria-label={`View provider → ${company.name}`}><ArrowRight size={20} /></Link>
                </div>
              </div>
            </article>
          })}
        </div> : <p className="text-text-secondary">No providers are listed yet — check back soon.</p>}
      </Resource>
      <p className="mt-6"><Link className="sf-secondary-link" to="/companies">Browse all providers <ArrowRight size={16} /></Link></p>
    </section>

    {/* How it works */}
    <section className="sf-how-section" id="how-it-works">
      <div className="sf-section-heading">
        <div>
          <p className="sf-eyebrow"><span />HOW IT WORKS</p>
          <h2>From request to invoice,<br />in the open.</h2>
        </div>
        <p>Two sides, one clear process.<br className="hidden md:block" />Pick the path that fits you.</p>
      </div>
      <Tabs
        label="How ServiceFlow works"
        items={[{ key: 'client', label: 'For Clients' }, { key: 'provider', label: 'For Providers' }]}
        value={howPath}
        onChange={setHowPath}
      >
        <div className="sf-how-grid">
          {howSteps[howPath].map(({ icon: Icon, title, text }, index) => (
            <div key={title}>
              <span className="sf-how-number">0{index + 1}</span>
              <Icon size={24} /><h3>{title}</h3><p>{text}</p>
            </div>
          ))}
        </div>
      </Tabs>
    </section>

    {/* Flow AI sample */}
    <section className="sf-directory-section" aria-labelledby="landing-flow-ai">
      <div className="sf-section-heading">
        <div>
          <p className="sf-eyebrow"><span />FLOW AI</p>
          <h2 id="landing-flow-ai">Answers from the policy,<br />not from guesswork.</h2>
          <p>Flow AI answers questions only from a provider's uploaded policy documents — and says so when the document doesn't cover the question. Sample preview:</p>
        </div>
      </div>
      <div className="sf-flowai-grid">
        <FlowAIPanel
          question="What is the call-out fee for a basic inspection?"
          answer="The basic inspection is LKR 3,000 in total: an inspection fee of LKR 2,500 plus a call-out fee of LKR 500."
          source="BrightFix Service Policy"
          page={2}
        />
        <FlowAIPanel
          question="Do you offer a lifetime warranty on repairs?"
        />
      </div>
    </section>

    {/* Dual CTA */}
    <section className="sf-dual-cta">
      <div className="sf-directory-cta">
        <div><Search size={23} /><h2>Need a service?</h2><p>Find a verified provider and send your first request.</p></div>
        <Link className="sf-primary-link" to="/companies">Find Providers<ArrowUpRight size={18} /></Link>
      </div>
      <div className="sf-directory-cta">
        <div><Building2 size={23} /><h2>Run a service business?</h2><p>List your services, receive requests and manage jobs in one place.</p></div>
        <Link className="sf-primary-link" to="/register">Join as a Provider<ArrowUpRight size={18} /></Link>
      </div>
    </section>
  </>
}
