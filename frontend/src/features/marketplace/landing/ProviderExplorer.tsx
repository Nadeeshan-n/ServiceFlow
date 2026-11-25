import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, GitCompareArrows, MapPin, Search, ShieldCheck, X } from 'lucide-react'
import { Modal, StarRating } from '../../../components'
import { money } from '../../../components/client-shared'
import type { Company } from '../../../types/client'

type SortKey = 'recommended' | 'jobs' | 'price-low' | 'price-high' | 'name'

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'jobs', label: 'Most jobs completed' },
  { key: 'price-low', label: 'Price: low to high' },
  { key: 'price-high', label: 'Price: high to low' },
  { key: 'name', label: 'Name A–Z' },
]

export function startingPrice(company: Company): number | null {
  const prices = company.offerings.filter(offer => offer.active).map(offer => offer.starting_price)
  return prices.length ? Math.min(...prices) : (company.starting_price ?? null)
}

type Props = {
  companies: Company[]
  query: string
  onQueryChange: (value: string) => void
  onPickProvider: (name: string) => void
  notify: (text: string) => void
}

export function ProviderExplorer({ companies, query, onQueryChange, onPickProvider, notify }: Props) {
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState<SortKey>('recommended')
  const [compare, setCompare] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)

  const categories = useMemo(() => ['All', ...Array.from(new Set(companies.map(company => company.category)))], [companies])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = companies.filter(company => {
      if (category !== 'All' && company.category !== category) return false
      if (!q) return true
      return `${company.name} ${company.category} ${company.location} ${company.offerings.map(o => o.name).join(' ')}`.toLowerCase().includes(q)
    })
    const price = (company: Company) => startingPrice(company) ?? Number.POSITIVE_INFINITY
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'jobs': return (b.completed_jobs ?? 0) - (a.completed_jobs ?? 0)
        case 'price-low': return price(a) - price(b)
        case 'price-high': return (startingPrice(b) ?? -1) - (startingPrice(a) ?? -1)
        case 'name': return a.name.localeCompare(b.name)
        default: return (b.rating ?? 0) - (a.rating ?? 0) || (b.completed_jobs ?? 0) - (a.completed_jobs ?? 0)
      }
    })
  }, [companies, query, category, sort])

  function toggleCompare(id: string) {
    setCompare(current => {
      if (current.includes(id)) return current.filter(item => item !== id)
      if (current.length >= 2) { notify('Compare tray holds two providers — remove one first.'); return current }
      return [...current, id]
    })
  }

  const compared = compare.map(id => companies.find(company => company.id === id)).filter((c): c is Company => !!c)
  const winner = compared.length === 2
    ? [...compared].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.completed_jobs ?? 0) - (a.completed_jobs ?? 0))[0]
    : null

  return <div>
    <div className="sf-explorer-controls">
      <label className="sf-landing-search-field sf-explorer-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search providers</span>
        <input type="search" value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Search name, service or area — results update as you type" />
      </label>
      <label className="sf-explorer-sort">
        <span className="sr-only">Sort providers</span>
        <select value={sort} onChange={event => setSort(event.target.value as SortKey)} className="sf-input">
          {sortOptions.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
      </label>
    </div>

    <div className="sf-lab-trades sf-explorer-chips" role="group" aria-label="Filter by category">
      {categories.map(item => (
        <button key={item} type="button" aria-pressed={category === item}
          className={`sf-lab-chip sf-chip-light ${category === item ? 'is-active' : ''}`} onClick={() => setCategory(item)}>{item}</button>
      ))}
    </div>

    {visible.length ? <div className="sf-company-grid">
      {visible.map((company, index) => {
        const price = startingPrice(company)
        const initials = company.name.split(' ').map(part => part[0]).slice(0, 2).join('')
        const selected = compare.includes(company.id)
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
            <p className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
              <StarRating rating={company.rating ?? 0} />
              <span className="sf-tabular">{company.rating != null ? company.rating.toFixed(1) : 'New'}</span>
              {company.rating != null && <span>· {company.review_count ?? 0} review{(company.review_count ?? 0) === 1 ? '' : 's'}</span>}
              {' · '}<span className="sf-tabular">{company.completed_jobs ?? 0}</span> job{(company.completed_jobs ?? 0) === 1 ? '' : 's'} completed
            </p>
            <p className="sf-availability">{company.offerings.some(o => o.active) ? '● Accepting requests' : '○ Ask for availability'}</p>
            <div className="sf-offering-tags">
              {company.offerings.filter(o => o.active).slice(0, 3).map(o => <span key={o.id}>{o.name}</span>)}
            </div>
            <div className="sf-company-card-bottom">
              <div><small>STARTING FROM</small><strong>{price != null ? money(price) : 'Price on quotation'}</strong></div>
              <div className="flex items-center gap-2">
                <button type="button" aria-pressed={selected} className={`sf-compare-btn ${selected ? 'is-on' : ''}`} onClick={() => toggleCompare(company.id)}>
                  <GitCompareArrows size={15} aria-hidden="true" /> {selected ? 'In tray' : 'Compare'}
                </button>
                <Link className="sf-company-open" to={`/companies/${company.id}`} aria-label={`View provider → ${company.name}`}><ArrowRight size={20} /></Link>
              </div>
            </div>
          </div>
        </article>
      })}
    </div> : <p className="text-text-secondary">No providers match that search — try a different service or area.</p>}

    {compared.length > 0 && <div className="sf-compare-tray" role="region" aria-label="Compare tray">
      <div className="flex flex-wrap items-center gap-2">
        <GitCompareArrows size={17} aria-hidden="true" />
        {compared.map(company => (
          <span key={company.id} className="sf-compare-pill">{company.name}
            <button type="button" aria-label={`Remove ${company.name} from compare`} onClick={() => toggleCompare(company.id)}><X size={13} /></button>
          </span>
        ))}
        {compared.length === 1 && <span className="text-sm text-text-secondary">Pick one more provider to compare head-to-head.</span>}
      </div>
      <button type="button" className="sf-primary-link" disabled={compared.length !== 2} onClick={() => setCompareOpen(true)}>Compare head-to-head</button>
    </div>}

    <Modal open={compareOpen && compared.length === 2} title="Head-to-head" description="Sample comparison from the listed provider details." onClose={() => setCompareOpen(false)}>
      {compared.length === 2 && <div>
        <div className="sf-versus">
          {compared.map(company => {
            const price = startingPrice(company)
            return <div key={company.id} className={`sf-versus-card ${winner?.id === company.id ? 'is-winner' : ''}`}>
              <h3 className="sf-display font-semibold">{company.name}{winner?.id === company.id && <span className="sf-versus-badge">Better rated</span>}</h3>
              <dl>
                <div><dt>Rating</dt><dd>{company.rating != null ? company.rating.toFixed(1) : 'New'}</dd></div>
                <div><dt>Jobs completed</dt><dd>{company.completed_jobs ?? 0}</dd></div>
                <div><dt>Starting from</dt><dd>{price != null ? money(price) : 'On quotation'}</dd></div>
                <div><dt>Area</dt><dd>{company.location}</dd></div>
                <div><dt>Services listed</dt><dd>{company.offerings.filter(o => o.active).length}</dd></div>
              </dl>
            </div>
          })}
        </div>
        {winner && <button type="button" className="sf-stamp-button mt-5" onClick={() => { onPickProvider(winner.name); setCompareOpen(false) }}>
          Load {winner.name} into the Ticket Lab
        </button>}
      </div>}
    </Modal>
  </div>
}
