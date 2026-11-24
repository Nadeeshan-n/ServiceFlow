import { useEffect, useRef, useState } from 'react'
import { Minus, Plus, ReceiptText } from 'lucide-react'
import { money } from '../../../components/client-shared'
import { LABOUR_PER_HOUR, estimatorAddons, trades, urgencyOptions } from './data'

type Props = {
  onApply: (tradeId: string, total: number) => void
  notify: (text: string) => void
}

export function Estimator({ onApply, notify }: Props) {
  const [tradeId, setTradeId] = useState('plumbing')
  const [addons, setAddons] = useState<string[]>([])
  const [hours, setHours] = useState(2)
  const [urgencyId, setUrgencyId] = useState('standard')
  const [displayTotal, setDisplayTotal] = useState(0)
  const frame = useRef<number>(0)

  const trade = trades.find(item => item.id === tradeId) ?? trades[0]
  const urgency = urgencyOptions.find(item => item.id === urgencyId) ?? urgencyOptions[0]
  const addonLines = estimatorAddons.filter(addon => addons.includes(addon.id))
  const subtotal = trade.fee + trade.callout + hours * LABOUR_PER_HOUR + addonLines.reduce((sum, addon) => sum + addon.amount, 0)
  const total = Math.round(subtotal * urgency.multiplier / 10) * 10

  useEffect(() => {
    const from = displayTotal
    const start = performance.now()
    const duration = 450
    cancelAnimationFrame(frame.current)
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      setDisplayTotal(Math.round(from + (total - from) * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  function toggleAddon(id: string) {
    setAddons(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  return <div className="sf-estimator">
    <div className="sf-estimator-controls">
      <label className="sf-est-field">
        <span>Trade</span>
        <select className="sf-input" value={tradeId} onChange={event => setTradeId(event.target.value)}>
          {trades.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>

      <fieldset className="sf-est-field">
        <legend>Add-ons</legend>
        {estimatorAddons.map(addon => (
          <label key={addon.id} className="sf-lab-toggle">
            <input type="checkbox" checked={addons.includes(addon.id)} onChange={() => toggleAddon(addon.id)} />
            {addon.label} (+{money(addon.amount)})
          </label>
        ))}
      </fieldset>

      <div className="sf-est-field">
        <span>Labour hours</span>
        <div className="sf-stepper">
          <button type="button" aria-label="Fewer hours" onClick={() => setHours(h => Math.max(1, h - 1))}><Minus size={15} /></button>
          <strong className="sf-tabular">{hours} h</strong>
          <button type="button" aria-label="More hours" onClick={() => setHours(h => Math.min(8, h + 1))}><Plus size={15} /></button>
        </div>
      </div>

      <label className="sf-est-field">
        <span>Urgency</span>
        <select className="sf-input" value={urgencyId} onChange={event => setUrgencyId(event.target.value)}>
          {urgencyOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
    </div>

    <div className="sf-receipt" aria-live="polite">
      <p className="sf-mono text-[11px] text-text-secondary"><ReceiptText size={13} className="mr-1 inline" /> Estimate only — sample rates</p>
      <dl className="sf-ticket-lines">
        <div><dt>{trade.jobTitle}</dt><dd className="sf-tabular">{money(trade.fee)}</dd></div>
        <div><dt>Call-out</dt><dd className="sf-tabular">{money(trade.callout)}</dd></div>
        <div><dt>Labour · {hours} h</dt><dd className="sf-tabular">{money(hours * LABOUR_PER_HOUR)}</dd></div>
        {addonLines.map(addon => <div key={addon.id}><dt>{addon.label}</dt><dd className="sf-tabular">{money(addon.amount)}</dd></div>)}
        {urgency.multiplier !== 1 && <div><dt>Urgency ×{urgency.multiplier}</dt><dd className="sf-tabular">applied</dd></div>}
        <div className="sf-ticket-total"><dt>Estimated total</dt><dd className="sf-tabular">{money(displayTotal)}</dd></div>
      </dl>
      <button type="button" className="sf-stamp-button mt-4" onClick={() => { onApply(tradeId, total); notify('Estimate pushed to your ticket in the Ticket Lab.') }}>
        Push estimate to my ticket
      </button>
    </div>
  </div>
}
