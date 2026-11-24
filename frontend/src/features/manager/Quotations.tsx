import { Link } from 'react-router-dom'
import { EmptyState, SurfaceCard } from '../../components'
import { PageHeader, RecordStatus, Resource, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { QuotationRow, RequestRow } from '../../types/provider'

type QuotationListRow = { request: RequestRow; quotation: QuotationRow | null }

export default function ManagerQuotations() {
  // The request status never moves past QUOTATION_SENT, so listing requests
  // alone makes decided quotations look merely "sent". Load each request's
  // latest quotation and show its real status and total instead.
  const quotations = useResource(async (): Promise<QuotationListRow[]> => {
    const res = await providerService.listIncomingRequests('QUOTATION_SENT')
    return Promise.all(res.items.map(async request => {
      const list = await providerService
        .listQuotations(request.id)
        .catch(() => [] as QuotationRow[])
      const quotation = list
        .filter(q => q.status !== 'DRAFT')
        .sort((a, b) => b.id - a.id)[0] ?? null
      return { request, quotation }
    }))
  }, [])

  return <>
    <PageHeader
      title="Quotations"
      description="Quotations you have sent to customers, with their current state."
    />
    <Resource {...quotations} retry={quotations.reload}>
      {quotations.data && quotations.data.length === 0
        ? <EmptyState
            title="No quotations yet"
            description="Sent quotations will appear here."
          />
        : <div className="space-y-3">
            {quotations.data?.map(({ request, quotation }) => (
              <SurfaceCard key={request.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="sf-mono text-xs text-text-secondary">Request #{request.id}</span>
                    <RecordStatus status={quotation?.status ?? request.status} />
                  </div>
                  <p className="line-clamp-2">{request.description}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {request.preferred_date} · {request.address}
                    {quotation && <> · Total LKR {Number(quotation.total_amount).toFixed(2)}</>}
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
