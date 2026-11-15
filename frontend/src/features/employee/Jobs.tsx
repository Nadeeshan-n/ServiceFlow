import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ActionButton, EmptyState, Modal, SelectField, SurfaceCard, TextAreaField,
} from '../../components'
import { Notice, PageHeader, RecordStatus, Resource, dateTime, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { JobRow } from '../../types/provider'

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'JOB_CREATED', label: 'Job created' },
  { value: 'SCHEDULE_PROPOSED', label: 'Schedule proposed' },
  { value: 'SCHEDULE_CONFIRMED', label: 'Schedule confirmed' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function ManagerJobs() {
  const [status, setStatus] = useState('')
  const jobs = useResource(() => providerService.listJobs({ status: status || undefined }), [status])
  const [cancelling, setCancelling] = useState<JobRow | null>(null)
  const navigate = useNavigate()

  return <>
    <PageHeader title="Jobs" description="All jobs for your company." />
    <div className="mb-5 max-w-xs">
      <SelectField label="Filter by status" value={status} onChange={e => setStatus(e.target.value)}>
        {STATUS_FILTERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </SelectField>
    </div>

    <Resource {...jobs} retry={jobs.reload}>
      {jobs.data && jobs.data.items.length === 0
        ? <EmptyState title="No jobs" description={status ? 'No jobs with this status.' : 'Approved quotations create jobs automatically.'} />
        : <div className="space-y-2">{jobs.data?.items.map(j => (
            <SurfaceCard key={j.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="sf-mono text-xs text-text-secondary">Job #{j.id}</span>
                  <RecordStatus status={j.status} />
                </div>
                <p className="mt-1 text-sm">
                  Request #{j.request_id}
                  {j.schedule_date && ` · ${j.schedule_date}${j.schedule_time ? ` ${j.schedule_time.slice(0, 5)}` : ''}`}
                </p>
                <p className="text-xs text-text-secondary">
                  {j.assigned_user_id ? `Assigned to employee #${j.assigned_user_id}` : 'Not assigned'}
                  {j.completed_at && ` · Completed ${dateTime(j.completed_at)}`}
                  {j.cancelled_at && ` · Cancelled ${dateTime(j.cancelled_at)}`}
                </p>
              </div>
              <div className="flex gap-2">
                {['JOB_CREATED', 'SCHEDULE_PROPOSED'].includes(j.status) && (
                  <ActionButton variant="stub" size="small" onClick={() => navigate('/manager/schedule')}>
                    Schedule
                  </ActionButton>
                )}
                {['JOB_CREATED', 'SCHEDULE_PROPOSED', 'SCHEDULE_CONFIRMED'].includes(j.status) && (
                  <ActionButton variant="void" size="small" onClick={() => setCancelling(j)}>Cancel</ActionButton>
                )}
              </div>
            </SurfaceCard>
          ))}</div>}
    </Resource>

    <Modal open={!!cancelling} title="Cancel this job?" onClose={() => setCancelling(null)}>
      {cancelling && <CancelJob
        job={cancelling}
        onDone={() => { setCancelling(null); jobs.reload() }}
        onCancel={() => setCancelling(null)}
      />}
    </Modal>
  </>
}

function CancelJob({ job, onDone, onCancel }: {
  job: JobRow
  onDone: () => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (pending || !reason.trim()) return
    setPending(true); setError('')
    try {
      await providerService.cancelJob(job.id, reason.trim())
      onDone()
    } catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }

  return <form onSubmit={submit} className="space-y-4">
    <p className="text-sm">Job #{job.id} will be cancelled. The employee will no longer see it in My Day.</p>
    <TextAreaField label="Reason for cancellation" value={reason} onChange={e => setReason(e.target.value)} required minLength={3} />
    {error && <Notice error>{error}</Notice>}
    <div className="flex justify-end gap-2">
      <ActionButton type="button" onClick={onCancel}>Keep job</ActionButton>
      <ActionButton type="submit" variant="void" disabled={pending || reason.trim().length < 3}>
        {pending ? 'Cancelling…' : 'Cancel job'}
      </ActionButton>
    </div>
  </form>
}