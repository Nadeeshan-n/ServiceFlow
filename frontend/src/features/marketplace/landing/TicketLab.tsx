import { useRef, useState } from 'react'
import { ArrowRight, Moon, RefreshCw, Send, Stamp } from 'lucide-react'
import { StatusBadge, SurfaceCard, type WorkflowStatus } from '../../../components'
import { money } from '../../../components/client-shared'
import { barcodePattern, labTotal, randomDocket, stages, trades, type LabState } from './data'

const stageBadges: { status: WorkflowStatus; label: string }[] = [
  { status: 'awaiting', label: 'Request sent' },
  { status: 'awaiting', label: 'Quoted' },
  { status: 'approved', label: 'Approved' },
  { status: 'scheduled', label: 'Scheduled' },
  { status: 'completed', label: 'Done' },
]

type Props = {
  lab: LabState
  onChange: (lab: LabState) => void
  onSendToBoard: () => void
  notify: (text: string) => void
}

export function TicketLab({ lab, onChange, onSendToBoard, notify }: Props) {
  const trade = trades.find(item => item.id === lab.tradeId) ?? trades[0]
  const { lines, total } = labTotal(lab)
  const badge = stageBadges[lab.stage]
  const [tilt, setTilt] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  function setStage(stage: number) {
    onChange({ ...lab, stage })
    if (stage === 2) notify('Quotation approved — stamp applied.')
    if (stage === 4) notify('Job done. The invoice stub is ready below.')
  }

  function handleTilt(event: React.PointerEvent) {
    if (event.pointerType !== 'mouse') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    setTilt(`perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg)`)
  }

  return <div>
    <div className="sf-lab-trades" role="group" aria-label="Choose a trade">
      {trades.map(item => (
        <button key={item.id} type="button" aria-pressed={item.id === lab.tradeId}
          className={`sf-lab-chip ${item.id === lab.tradeId ? 'is-active' : ''}`}
          onClick={() => onChange({ ...lab, tradeId: item.id, estimate: lab.estimate?.tradeId === item.id ? lab.estimate : null })}>
          {item.name}
        </button>
      ))}
    </div>

    <div ref={wrapRef} onPointerMove={handleTilt} onPointerLeave={() => setTilt('')}>
      <SurfaceCard className="sf-lab-ticket p-6" >
        <div style={{ transform: tilt, transition: tilt ? 'transform .08s' : 'transform .35s' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="sf-mono text-[11px] text-text-secondary">{lab.docket}</p>
              <h3 className="sf-display mt-2 text-xl font-semibold">{trade.jobTitle}</h3>
              <p className="mt-1 text-sm text-text-secondary">{lab.providerName} · Client: You (sample)</p>
            </div>
            <button type="button" className="sf-lab-mini" onClick={() => onChange({ ...lab, docket: randomDocket() })} title="Regenerate docket number">
              <RefreshCw size={13} aria-hidden="true" /> New docket
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge status={badge.status} label={badge.label} />
            <StatusBadge status={lab.stage >= 4 ? 'paid' : 'unpaid'} />
          </div>

          <dl className="sf-ticket-lines">
            {lines.map(line => <div key={line.label}><dt>{line.label}</dt><dd className="sf-tabular">{money(line.amount)}</dd></div>)}
            <div className="sf-ticket-total"><dt>Total</dt><dd className="sf-tabular">{money(total)}</dd></div>
          </dl>

          <label className="sf-lab-toggle">
            <input type="checkbox" checked={lab.afterHours} onChange={event => onChange({ ...lab, afterHours: event.target.checked })} />
            <Moon size={15} aria-hidden="true" /> After-hours visit (+{money(1500)})
          </label>

          <div className="sf-separator mt-4 flex items-end justify-between gap-3 pt-4">
            <div className="sf-barcode" style={{ background: barcodePattern(lab.docket) }} aria-hidden="true" />
            {lab.stage >= 2 && <span key={lab.docket + lab.stage} className="sf-approval-stamp sf-stamp-in">Quotation approved ✓</span>}
          </div>
        </div>
      </SurfaceCard>
    </div>

    <ol className="sf-lab-stepper" aria-label="Job stages">
      {stages.map((stage, index) => (
        <li key={stage}>
          <button type="button" aria-current={index === lab.stage ? 'step' : undefined}
            className={`sf-lab-step ${index < lab.stage ? 'is-done' : ''} ${index === lab.stage ? 'is-current' : ''}`}
            onClick={() => setStage(index)}>
            <span>{index + 1}</span>{stage}
          </button>
        </li>
      ))}
    </ol>

    <div className="sf-lab-actions">
      {lab.stage < 2
        ? <button type="button" className="sf-stamp-button" onClick={() => setStage(2)}><Stamp size={16} aria-hidden="true" /> Stamp it approved</button>
        : <button type="button" className="sf-stamp-button" disabled={lab.stage >= 4} onClick={() => setStage(Math.min(4, lab.stage + 1))}>Advance stage <ArrowRight size={16} aria-hidden="true" /></button>}
      <button type="button" className="sf-lab-ghost" onClick={onSendToBoard}><Send size={15} aria-hidden="true" /> Send my ticket to the board</button>
    </div>
  </div>
}
