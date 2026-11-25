import { useState } from 'react'
import {
  ActionButton, EmptyState, Modal, SelectField, SurfaceCard,
} from '../../components'
import { Notice, PageHeader, Resource, dateTime, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { AdminProviderRow } from '../../types/provider'

const VERIFICATION_FILTERS = [
  { value: '', label: 'All providers' },
  { value: 'PENDING', label: 'Pending approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

const TYPE_FILTERS = [
  { value: '', label: 'All types' },
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'COMPANY', label: 'Company' },
]

type ProviderAction = 'approve' | 'reject' | 'suspend' | 'reactivate'

const ACTION_COPY: Record<ProviderAction, { title: string; body: (name: string) => string; confirm: string; variant: 'stamp' | 'void' }> = {
  approve: {
    title: 'Approve this provider?',
    body: name => `“${name}” will be approved and can start receiving service requests.`,
    confirm: 'Approve provider',
    variant: 'stamp',
  },
  reject: {
    title: 'Reject this provider?',
    body: name => `“${name}” will be rejected and will not be able to sign in or receive requests. You can approve them later if this changes.`,
    confirm: 'Reject provider',
    variant: 'void',
  },
  suspend: {
    title: 'Suspend this provider?',
    body: name => `“${name}” will be suspended and hidden from the client directory until they are reactivated.`,
    confirm: 'Suspend provider',
    variant: 'void',
  },
  reactivate: {
    title: 'Reactivate this provider?',
    body: name => `“${name}” will be reactivated and visible in the client directory again.`,
    confirm: 'Reactivate provider',
    variant: 'stamp',
  },
}

export default function AdminCompanies() {
  const [status, setStatus] = useState('PENDING')
  const [type, setType] = useState('')
  const providers = useResource(
    () => providerService.adminListProviders({
      verification_status: status || undefined,
      provider_type: type || undefined,
    }),
    [status, type],
  )
  const [confirming, setConfirming] = useState<{ provider: AdminProviderRow; action: ProviderAction } | null>(null)
  const [acting, setActing] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function confirmAction() {
    if (!confirming) return
    const { provider, action } = confirming
    setActing(true); setDialogError('')
    try {
      const fn =
        action === 'approve' ? providerService.adminApproveProvider :
        action === 'reject' ? providerService.adminRejectProvider :
        action === 'reactivate' ? providerService.adminReactivateProvider :
        providerService.adminSuspendProvider
      const res = await fn(provider.id)
      setSuccess(res.message || `Provider #${provider.id} ${action}d.`)
      setError('')
      setConfirming(null)
      providers.reload()
    } catch (c) { setDialogError((c as Error).message) } finally { setActing(false) }
  }

  return <>
    <PageHeader title="Verification queue" description="Approve, reject or suspend service providers." />

    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <SelectField label="Status" value={status} onChange={e => setStatus(e.target.value)}>
        {VERIFICATION_FILTERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </SelectField>
      <SelectField label="Provider type" value={type} onChange={e => setType(e.target.value)}>
        {TYPE_FILTERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </SelectField>
    </div>

    {error && <div className="mb-3"><Notice error>{error}</Notice></div>}
    {success && <div className="mb-3"><Notice>{success}</Notice></div>}

    <Resource {...providers} retry={providers.reload}>
      {providers.data && providers.data.items.length === 0
        ? <EmptyState
            title="No providers"
            description={status === 'PENDING' ? 'No providers awaiting verification.' : 'No providers match these filters.'}
          />
        : <div className="space-y-2">{providers.data?.items.map(p => (
            <ProviderCard key={p.id} provider={p} onAction={(provider, action) => { setSuccess(''); setDialogError(''); setConfirming({ provider, action }) }} />
          ))}</div>}
    </Resource>

    <Modal open={!!confirming} title={confirming ? ACTION_COPY[confirming.action].title : ''} onClose={() => { if (!acting) { setConfirming(null); setDialogError('') } }}>
      {confirming && <div className="space-y-5">
        <p className="text-sm">{ACTION_COPY[confirming.action].body(confirming.provider.name)}</p>
        {dialogError && <Notice error>{dialogError}</Notice>}
        <div className="flex flex-wrap justify-end gap-3">
          <ActionButton variant="stub" onClick={() => { setConfirming(null); setDialogError('') }} disabled={acting}>Cancel</ActionButton>
          <ActionButton variant={ACTION_COPY[confirming.action].variant} onClick={() => void confirmAction()} disabled={acting}>
            {acting ? 'Working…' : ACTION_COPY[confirming.action].confirm}
          </ActionButton>
        </div>
      </div>}
    </Modal>
  </>
}

function ProviderCard({ provider, onAction }: {
  provider: AdminProviderRow
  onAction: (provider: AdminProviderRow, action: ProviderAction) => void
}) {
  const s = provider.verification_status
  return <SurfaceCard className="space-y-3 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="sf-display font-semibold">{provider.name}</h3>
          <span className={`rounded px-2 py-0.5 text-xs ${statusClass(s)}`}>{s}</span>
          <span className="rounded bg-paper px-2 py-0.5 text-xs text-text-secondary">{provider.type}</span>
        </div>
        <p className="mt-1 text-sm text-text-secondary">{provider.description ?? 'No description'}</p>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
      <div><p className="text-xs text-text-secondary">Email</p><p>{provider.email}</p></div>
      <div><p className="text-xs text-text-secondary">Phone</p><p>{provider.phone}</p></div>
      <div><p className="text-xs text-text-secondary">Address</p><p>{provider.address ?? '—'}</p></div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
      <p className="text-xs text-text-secondary">Registered {dateTime(provider.created_at)}</p>
      <div className="flex flex-wrap gap-2">
        {s !== 'APPROVED' && s !== 'SUSPENDED' && (
          <ActionButton variant="stamp" size="small" onClick={() => onAction(provider, 'approve')}>
            Approve
          </ActionButton>
        )}
        {s !== 'REJECTED' && s !== 'SUSPENDED' && (
          <ActionButton variant="void" size="small" onClick={() => onAction(provider, 'reject')}>
            Reject
          </ActionButton>
        )}
        {s === 'SUSPENDED' && (
          <ActionButton variant="stamp" size="small" onClick={() => onAction(provider, 'reactivate')}>
            Reactivate
          </ActionButton>
        )}
        {s === 'APPROVED' && (
          <ActionButton variant="void" size="small" onClick={() => onAction(provider, 'suspend')}>
            Suspend
          </ActionButton>
        )}
      </div>
    </div>
  </SurfaceCard>
}

function statusClass(s: string): string {
  if (s === 'APPROVED') return 'bg-[var(--sf-success-bg)] text-[var(--sf-success)]'
  if (s === 'PENDING') return 'bg-[var(--sf-warning-bg)] text-[var(--sf-warning)]'
  if (s === 'REJECTED') return 'bg-[var(--sf-error-bg)] text-[var(--sf-error)]'
  return 'bg-paper text-text-secondary'
}