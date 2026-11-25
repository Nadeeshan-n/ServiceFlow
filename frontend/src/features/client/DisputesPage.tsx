import { Link } from 'react-router-dom'
import { SurfaceCard } from '../../components'
import { dateTime, PageHeader, Resource, useResource } from '../../components/client-shared'
import { clientFeedback } from '../../lib/client-feedback'

export function DisputesPage() {
  const resource = useResource(() => clientFeedback.myDisputes())

  return <>
    <PageHeader eyebrow="CLIENT WORKSPACE" title="Disputes" description="Issues you have raised about completed jobs, and how they are progressing." />
    <Resource {...resource} retry={resource.reload}>
      {resource.data && <>
        {resource.data.length ? <div className="space-y-4">{resource.data.map(dispute => <SurfaceCard key={dispute.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="sf-mono text-xs text-text-secondary">DISPUTE #{dispute.id} · JOB #{dispute.record_id}</p>
            <span className="text-sm text-text-secondary">{dispute.status.replaceAll('_', ' ')}</span>
          </div>
          <h2 className="sf-display mt-2 text-lg font-semibold">{dispute.reason}</h2>
          {dispute.description && <p className="mt-2 whitespace-pre-wrap text-sm">{dispute.description}</p>}
          <p className="mt-3 text-sm text-text-secondary">
            Opened {dateTime(dispute.created_at)}
            {dispute.closed_at && ` · Closed ${dateTime(dispute.closed_at)}`}
          </p>
          {dispute.admin_note && <div className="mt-4 rounded-docket border border-line bg-paper p-3 text-sm">
            <p className="text-xs text-text-secondary">Admin note</p>
            <p className="mt-1 whitespace-pre-wrap">{dispute.admin_note}</p>
          </div>}
          <div className="sf-separator mt-5 pt-4">
            <Link className="sf-link" to={`/client/jobs/${dispute.record_id}`}>View job →</Link>
          </div>
        </SurfaceCard>)}</div> : <SurfaceCard className="p-6"><p className="text-sm text-text-secondary">No disputes yet. If something goes wrong with a completed job, you can report it from the job's page.</p></SurfaceCard>}
      </>}
    </Resource>
  </>
}
