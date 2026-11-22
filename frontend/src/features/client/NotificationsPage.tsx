import { useState } from 'react'
import { ActionButton, SurfaceCard } from '../../components'
import { dateTime, Notice, PageHeader, Resource, useResource } from '../../components/client-shared'
import { clientService, type ClientNotification } from '../../lib/client-service'

export function NotificationsPage() {
  const resource = useResource(async () => {
    const [items, unread] = await Promise.all([clientService.notifications(), clientService.unreadNotificationCount()])
    return { items, unread }
  })
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')

  async function markRead(item: ClientNotification) {
    setPending(item.id)
    setError('')
    try { await clientService.markNotificationRead(item.id); resource.reload() }
    catch (cause) { setError((cause as Error).message) }
    finally { setPending('') }
  }

  async function markAll() {
    setPending('all')
    setError('')
    try { await clientService.markAllNotificationsRead(); resource.reload() }
    catch (cause) { setError((cause as Error).message) }
    finally { setPending('') }
  }

  return <>
    <PageHeader eyebrow="CLIENT WORKSPACE" title="Notifications" description="Job updates, quotation arrivals and payment events." />
    <Resource {...resource} retry={resource.reload}>
      {resource.data && <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">{resource.data.unread ? `${resource.data.unread} unread` : 'All caught up'}</p>
          <ActionButton variant="stamp" disabled={pending === 'all' || !resource.data.unread} onClick={() => void markAll()}>{pending === 'all' ? 'Updating…' : 'Mark all as read'}</ActionButton>
        </div>
        {error && <div className="mb-5"><Notice error>{error}</Notice></div>}
        {resource.data.items.length ? <div className="space-y-4">{resource.data.items.map(item => <SurfaceCard key={item.id} className={`p-5 ${item.is_read ? '' : 'border-[var(--sf-signal)]'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="sf-mono text-xs text-text-secondary">{item.type.replaceAll('_', ' ')}</p>
              <h2 className="sf-display mt-1 text-lg font-semibold">{item.title}</h2>
            </div>
            <span className="text-sm text-text-secondary">{dateTime(item.created_at)}</span>
          </div>
          <p className="mt-2 text-sm">{item.message}</p>
          {!item.is_read && <div className="mt-4"><ActionButton disabled={pending === item.id} onClick={() => void markRead(item)}>{pending === item.id ? 'Updating…' : 'Mark as read'}</ActionButton></div>}
        </SurfaceCard>)}</div> : <SurfaceCard className="p-6"><p className="text-sm text-text-secondary">No notifications yet.</p></SurfaceCard>}
      </>}
    </Resource>
  </>
}
