import { Link } from 'react-router-dom'
import { EmptyState, SurfaceCard } from '../../components'
import { PageHeader, RecordStatus, Resource, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'

export default function ManagerQuotations() {
  const quotations = useResource(
    () => providerService.listIncomingRequests('QUOTATION_SENT'),
    [],
  )

  return <>
    <PageHeader
      title="Quotations"
      description="Quotations sent to customers and awaiting their decision."
    />
    <Resource {...quotations} retry={quotations.reload}>
      {quotations.data && quotations.data.items.length === 0
        ? <EmptyState
            title="No quotations yet"
            description="Sent quotations will appear here while customers review them."
          />
        : <div className="space-y-3">
            {quotations.data?.items.map(request => (
              <SurfaceCard key={request.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="sf-mono text-xs text-text-secondary">Request #{request.id}</span>
                    <RecordStatus status={request.status} />
                  </div>
                  <p className="line-clamp-2">{request.description}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {request.preferred_date} · {request.address}
                  </p>
                </div>
                <Link
                  to={`/manager/quotations/${request.id}`}
                  className="sf-action inline-flex min-h-9 items-center justify-center rounded-docket sf-stamp px-3 text-sm font-semibold"
                >
                  View quotation
                </Link>
              </SurfaceCard>
            ))}
          </div>}
    </Resource>
  </>
}
