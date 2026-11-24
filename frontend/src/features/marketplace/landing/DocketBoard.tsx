import { useEffect, useRef, useState } from 'react'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { money } from '../../../components/client-shared'
import { boardColumns, seedBoard, type BoardJob, type LabState, labTotal } from './data'

type Props = {
  lab: LabState
  sendSignal: number
  notify: (text: string) => void
  onCounts: (total: number, done: number) => void
}

export function DocketBoard({ lab, sendSignal, notify, onCounts }: Props) {
  const [jobs, setJobs] = useState<BoardJob[]>(seedBoard)
  const lastSignal = useRef(sendSignal)

  useEffect(() => { onCounts(jobs.length, jobs.filter(job => job.column === 3).length) }, [jobs, onCounts])

  useEffect(() => {
    if (sendSignal === lastSignal.current) return
    lastSignal.current = sendSignal
    const { total } = labTotal(lab)
    const tradeName = lab.docket
    setJobs(current => [{
      key: `mine-${sendSignal}`,
      id: tradeName,
      service: 'Your ticket (sample)',
      client: 'You',
      amount: total,
      column: 0,
    }, ...current])
    notify('Your ticket is on the board — advance it to Done to issue its invoice.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendSignal])

  function advance(job: BoardJob) {
    if (job.column >= 3) return
    const next = job.column + 1
    setJobs(current => current.map(item => {
      if (item.key !== job.key) return item
      if (next === 3) return { ...item, column: next, invoice: `SF-INV-${1043 + Math.floor(Math.random() * 400)}` }
      return { ...item, column: next }
    }))
    if (next === 3) notify(`Invoice issued for ${job.id}. Payment is recorded offline — the platform tracks the status.`)
    else notify(`${job.id} moved to ${boardColumns[next]}.`)
  }

  return <div>
    <div className="sf-board-head">
      <p className="text-sm text-text-secondary">Sample board — advance a job and watch the paperwork follow it.</p>
      <button type="button" className="sf-lab-ghost sf-board-reset" onClick={() => setJobs(seedBoard)}><RotateCcw size={14} aria-hidden="true" /> Reset board</button>
    </div>
    <div className="sf-board">
      {boardColumns.map((column, columnIndex) => {
        const columnJobs = jobs.filter(job => job.column === columnIndex)
        return <div key={column} className="sf-board-col">
          <h3>{column} <span className="sf-board-count">{columnJobs.length}</span></h3>
          {columnJobs.map(job => (
            <article key={job.key} className="sf-board-card">
              <p className="sf-mono text-[10px] text-text-secondary">{job.id}</p>
              <strong>{job.service}</strong>
              <p className="text-sm text-text-secondary">{job.client} · <span className="sf-tabular">{money(job.amount)}</span></p>
              {job.invoice
                ? <p className="sf-board-invoice">Invoice {job.invoice} · Unpaid</p>
                : <button type="button" className="sf-board-advance" onClick={() => advance(job)}>Advance <ArrowRight size={13} aria-hidden="true" /></button>}
            </article>
          ))}
          {!columnJobs.length && <p className="sf-board-empty">No jobs here yet.</p>}
        </div>
      })}
    </div>
  </div>
}
