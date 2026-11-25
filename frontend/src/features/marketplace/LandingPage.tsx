import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, Building2, CalendarCheck, Car, CheckCircle2, ClipboardCheck, ClipboardList,
  FileText, PaintRoller, Plug, Search, Sparkles, Wrench, Zap,
} from 'lucide-react'
import { Tabs } from '../../components'
import { Resource, useResource } from '../../components/client-shared'
import { clientService } from '../../lib/client-service'
import { demoMode } from '../../lib/api'
import { destination, useSession } from '../../app/session'
import { initialLab, type LabState } from './landing/data'
import { TicketLab } from './landing/TicketLab'
import { DocketBoard } from './landing/DocketBoard'
import { ProviderExplorer } from './landing/ProviderExplorer'
import { Estimator } from './landing/Estimator'
import { FlowAIChat } from './landing/FlowAIChat'

const serviceIcons = [
  { keyword: 'plumb', icon: Wrench },
  { keyword: 'electr', icon: Zap },
  { keyword: 'clean', icon: Sparkles },
  { keyword: 'vehicle', icon: Car },
  { keyword: 'appliance', icon: Plug },
  { keyword: 'paint', icon: PaintRoller },
] as const

function serviceIcon(name: string) {
  const lower = name.toLowerCase()
  return serviceIcons.find(entry => lower.includes(entry.keyword))?.icon ?? Wrench
}

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
type Toast = { id: number; text: string }

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const current = useRef(0)
  useEffect(() => {
    const from = current.current
    if (from === value) return
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 700)
      const next = Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 3)))
      current.current = next
      setDisplay(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <span className="sf-tabular">{display}</span>
}

export function LandingPage() {
  const { user } = useSession()
  const resource = useResource(() => clientService.companies())
  const companies = resource.data ?? []

  // Browse-by-service cards are derived from the services providers actually
  // offer, so a card can never promise providers that do not exist.
  const serviceCounts = new Map<string, number>()
  for (const company of companies) for (const offer of company.offerings) if (offer.active) serviceCounts.set(offer.name, (serviceCounts.get(offer.name) ?? 0) + 1)
  const serviceCards = [...serviceCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name))

  const [lab, setLab] = useState<LabState>(initialLab)
  const [sendSignal, setSendSignal] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [boardCounts, setBoardCounts] = useState({ total: 0, done: 0 })
  const [explorerQuery, setExplorerQuery] = useState('')
  const [howPath, setHowPath] = useState<HowPath>('client')
  const [activeStep, setActiveStep] = useState(0)
  const [howPaused, setHowPaused] = useState(false)
  const [progress, setProgress] = useState(0)

  function notify(text: string) {
    const id = Date.now() + Math.random()
    setToasts(current => [...current.slice(-2), { id, text }])
    window.setTimeout(() => setToasts(current => current.filter(toast => toast.id !== id)), 4200)
  }

  useEffect(() => {
    function onScroll() {
      const height = document.documentElement.scrollHeight - window.innerHeight
      setProgress(height > 0 ? Math.min(1, window.scrollY / height) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (howPaused) return
    const timer = window.setInterval(() => setActiveStep(step => (step + 1) % 3), 4500)
    return () => window.clearInterval(timer)
  }, [howPaused, howPath])

  function submitHeroSearch(event: FormEvent) {
    event.preventDefault()
    document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' })
  }

  return <>
    <div className="sf-scroll-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />

    {/* Hero — Ticket Lab */}
    <section className="sf-lab-hero">
      <div className="sf-lab-hero-copy">
        <p className="sf-eyebrow sf-eyebrow-dark"><span />DON'T READ ABOUT IT. RUN IT.</p>
        <h1 className="sf-display text-4xl font-bold md:text-6xl">
          Find a service provider<br />you can <span className="sf-marker">trust.</span>
        </h1>
        <p className="my-6 max-w-xl text-lg">
          This ticket is live. Pick a trade, watch it price itself, stamp the quotation approved and send it to the board — the same journey a real job takes on ServiceFlow.
        </p>
        <form className="sf-landing-search" onSubmit={submitHeroSearch} role="search" aria-label="Find a service provider">
          <label className="sf-landing-search-field">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Service or provider</span>
            <input type="search" value={explorerQuery} onChange={event => setExplorerQuery(event.target.value)} placeholder="Service or provider — filters the explorer below" />
          </label>
          <button type="submit" className="sf-primary-link">Explore providers</button>
        </form>
        <div className="flex flex-wrap gap-4">
          {user
            ? <Link className="sf-lab-dash-link" to={destination(user)}>Go to your dashboard <ArrowRight size={16} /></Link>
            : <Link className="sf-lab-dash-link" to="/register">Join as a Provider <ArrowRight size={16} /></Link>}
        </div>
        <p className="sf-mono mt-6 text-[11px]">SAMPLE TICKET · NO ACCOUNT NEEDED TO PLAY</p>
      </div>
      <TicketLab
        lab={lab}
        onChange={setLab}
        onSendToBoard={() => setSendSignal(signal => signal + 1)}
        notify={notify}
      />
    </section>

    {/* Dispatch ticker */}
    <div className="sf-ticker" aria-hidden="true">
      <div className="sf-ticker-track">
        {[...tickerItems, ...tickerItems].map((item, index) => (
          <span key={index}>{item}<span className="sf-ticker-sep">///</span></span>
        ))}
      </div>
    </div>

    {/* Live counters */}
    <section className="sf-counters" aria-label="ServiceFlow in numbers">
      <div><strong><CountUp value={companies.length} /></strong><span>Providers listed{demoMode ? ' (sample)' : ''}</span></div>
      <div><strong><CountUp value={boardCounts.total} /></strong><span>Jobs on the board below</span></div>
      <div><strong><CountUp value={boardCounts.done} /></strong><span>Jobs you finished</span></div>
      <div><strong><CountUp value={5} /></strong><span>Stages from request to invoice</span></div>
    </section>

    {/* Live Docket Board */}
    <section className="sf-directory-section" aria-labelledby="landing-board">
      <div className="sf-section-heading">
        <div>
          <p className="sf-eyebrow"><span />LIVE DOCKET BOARD</p>
          <h2 id="landing-board">Every job, on one board.</h2>
          <p>This is how work moves on ServiceFlow — requests become quotations, quotations become scheduled jobs, and finished jobs issue their invoice.</p>
        </div>
      </div>
      <DocketBoard lab={lab} sendSignal={sendSignal} notify={notify}
        onCounts={(total, done) => setBoardCounts(current => current.total === total && current.done === done ? current : { total, done })} />
    </section>

    {/* Categories — one card per service actually offered */}
    {serviceCards.length > 0 && <section className="sf-directory-section" aria-labelledby="landing-categories">
      <div className="sf-section-heading">
        <div>
          <p className="sf-eyebrow"><span />BROWSE BY SERVICE</p>
          <h2 id="landing-categories">What do you need done?</h2>
          <p>Start with a service — you will see the providers who offer it.</p>
        </div>
      </div>
      <div className="sf-category-grid">
        {serviceCards.map(({ name, count }) => {
          const Icon = serviceIcon(name)
          return <button key={name} type="button" className="sf-category-card" onClick={() => { setExplorerQuery(name); document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' }) }}>
            <Icon size={24} aria-hidden="true" />
            <span className="sf-display font-semibold">{name}</span>
            <span className="text-sm text-text-secondary">{`${count} provider${count === 1 ? '' : 's'} listed`}</span>
          </button>
        })}
      </div>
    </section>}

    {/* Provider explorer */}
    <section className="sf-directory-section" id="providers" aria-labelledby="landing-providers">
      <div className="sf-section-heading">
        <div>
          <p className="sf-eyebrow"><span />VERIFIED PROVIDERS</p>
          <h2 id="landing-providers">Providers on ServiceFlow</h2>
          <p>Search, filter and sort live — then pin two providers and compare them head-to-head.</p>
        </div>
        <span className="sf-directory-note">{demoMode ? 'Sample listings' : 'Live listings'}<br />Starting prices shown. Your quotation confirms the total.</span>
      </div>
      <Resource {...resource} retry={resource.reload}>
        {companies.length
          ? <ProviderExplorer companies={companies} query={explorerQuery} onQueryChange={setExplorerQuery}
              onPickProvider={name => { setLab(current => ({ ...current, providerName: name })); notify(`${name} loaded into your ticket — scroll up to the Ticket Lab.`); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              notify={notify} />
          : <p className="text-text-secondary">No providers are listed yet — check back soon.</p>}
      </Resource>
      <p className="mt-6"><Link className="sf-secondary-link" to="/companies">Browse all providers <ArrowRight size={16} /></Link></p>
    </section>

    {/* How it works — auto-advancing timeline */}
    <section className="sf-how-section" id="how-it-works"
      onMouseEnter={() => setHowPaused(true)} onMouseLeave={() => setHowPaused(false)}
      onFocus={() => setHowPaused(true)} onBlur={() => setHowPaused(false)}>
      <div className="sf-section-heading">
        <div>
          <p className="sf-eyebrow"><span />HOW IT WORKS</p>
          <h2>From request to invoice,<br />in the open.</h2>
        </div>
        <p>Two sides, one clear process.<br className="hidden md:block" />Pick the path that fits you — it plays on its own, hover to pause.</p>
      </div>
      <Tabs
        label="How ServiceFlow works"
        items={[{ key: 'client', label: 'For Clients' }, { key: 'provider', label: 'For Providers' }]}
        value={howPath}
        onChange={value => { setHowPath(value); setActiveStep(0) }}
      >
        <div className="sf-how-grid">
          {howSteps[howPath].map(({ icon: Icon, title, text }, index) => (
            <button key={title} type="button" className={`sf-how-card ${index === activeStep ? 'is-active' : ''}`} onClick={() => setActiveStep(index)}>
              <span className="sf-how-number">0{index + 1}</span>
              <Icon size={24} /><h3>{title}</h3><p>{text}</p>
              {index === activeStep && !howPaused && <span key={`${howPath}-${activeStep}`} className="sf-how-progress" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </Tabs>
    </section>

    {/* Estimator + Flow AI */}
    <section className="sf-directory-section" aria-labelledby="landing-tools">
      <div className="sf-section-heading">
        <div>
          <p className="sf-eyebrow"><span />TRY THE TOOLS</p>
          <h2 id="landing-tools">Price it. Then ask the policy.</h2>
          <p>Estimate a job with sample rates and push it onto your ticket — then ask Flow AI what the policy actually says.</p>
        </div>
      </div>
      <Estimator onApply={(tradeId, total) => setLab(current => ({ ...current, tradeId, estimate: { tradeId, total } }))} notify={notify} />
      <div className="mt-8">
        <FlowAIChat />
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

    {/* Toasts */}
    <div className="sf-toasts" aria-live="polite">
      {toasts.map(toast => <p key={toast.id} className="sf-toast"><CheckCircle2 size={16} aria-hidden="true" />{toast.text}</p>)}
    </div>
  </>
}
