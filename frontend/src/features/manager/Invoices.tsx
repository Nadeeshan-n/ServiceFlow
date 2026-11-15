import { useState, type FormEvent } from 'react'
import {
  ActionButton, EmptyState, Modal, SelectField, SurfaceCard, TextAreaField, TextField,
} from '../../components'
import { Notice, PageHeader, RecordStatus, Resource, dateTime, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { InvoiceRow, PaymentRow } from '../../types/provider'

export default function Invoices() {
  const invoices = useResource(() => providerService.listInvoices())
  const [openId, setOpenId] = useState<number | null>(null)

  const list = invoices.data?.items ?? []
  const unpaid = list.filter(i => i.payment_status !== 'PAID')
  const paid = list.filter(i => i.payment_status === 'PAID')
  const outstanding = unpaid.reduce((s, i) => s + Number(i.total_amount) - Number(i.paid_amount), 0)
  const collected = paid.reduce((s, i) => s + Number(i.paid_amount), 0)
  const billed = list.reduce((s, i) => s + Number(i.total_amount), 0)

  return <>
    <PageHeader title="Invoices" description="Billing records created automatically when a job is completed." />

    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <SurfaceCard className="p-4">
        <p className="sf-mono text-xs text-text-secondary">OUTSTANDING</p>
        <p className="sf-tabular mt-1 text-2xl font-semibold">LKR {outstanding.toFixed(2)}</p>
        <p className="mt-1 text-xs text-text-secondary">{unpaid.length} open</p>
      </SurfaceCard>
      <SurfaceCard className="p-4">
        <p className="sf-mono text-xs text-text-secondary">COLLECTED</p>
        <p className="sf-tabular mt-1 text-2xl font-semibold">LKR {collected.toFixed(2)}</p>
        <p className="mt-1 text-xs text-text-secondary">{paid.length} paid</p>
      </SurfaceCard>
      <SurfaceCard className="p-4">
        <p className="sf-mono text-xs text-text-secondary">TOTAL BILLED</p>
        <p className="sf-tabular mt-1 text-2xl font-semibold">LKR {billed.toFixed(2)}</p>
        <p className="mt-1 text-xs text-text-secondary">{list.length} invoice{list.length === 1 ? '' : 's'}</p>
      </SurfaceCard>
    </div>

    <Resource {...invoices} retry={invoices.reload}>
      {list.length === 0
        ? <EmptyState title="No invoices" description="Invoices are created automatically when a job is completed." />
        : <div className="space-y-2">{list.map(inv => (
            <SurfaceCard key={inv.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="sf-mono text-sm font-semibold">{inv.invoice_number}</span>
                  <RecordStatus status={inv.payment_status} />
                </div>
                <p className="mt-1 text-xs text-text-secondary">Issued {dateTime(inv.issued_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="sf-tabular font-semibold">LKR {Number(inv.total_amount).toFixed(2)}</p>
                  {inv.payment_status !== 'PAID' && (
                    <p className="text-xs text-text-secondary">
                      Due LKR {(Number(inv.total_amount) - Number(inv.paid_amount)).toFixed(2)}
                    </p>
                  )}
                </div>
                <ActionButton variant="stub" size="small" onClick={() => setOpenId(inv.id)}>Open</ActionButton>
              </div>
            </SurfaceCard>
          ))}</div>}
    </Resource>

    <Modal open={openId !== null} title="Invoice details" onClose={() => setOpenId(null)}>
      {openId !== null && <InvoiceDetail id={openId} onChanged={invoices.reload} />}
    </Modal>
  </>
}

function InvoiceDetail({ id, onChanged }: { id: number; onChanged: () => void }) {
  const inv = useResource(() => providerService.getInvoice(id), [id])
  const payments = useResource(() => providerService.listPayments(id), [id])
  const [recording, setRecording] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  async function download() {
    setDownloading(true); setError('')
    try { await providerService.downloadInvoicePdf(id) }
    catch (e) { setError((e as Error).message) } finally { setDownloading(false) }
  }

  return <Resource {...inv} retry={inv.reload}>
    {inv.data && <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="sf-mono text-lg font-semibold">{inv.data.invoice_number}</span>
          <RecordStatus status={inv.data.payment_status} />
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
          <div><span className="text-text-secondary">Issued:</span> {dateTime(inv.data.issued_at)}</div>
          {inv.data.paid_at && <div><span className="text-text-secondary">Paid:</span> {dateTime(inv.data.paid_at)}</div>}
          <div><span className="text-text-secondary">Total:</span> <strong className="sf-tabular">LKR {Number(inv.data.total_amount).toFixed(2)}</strong></div>
          <div><span className="text-text-secondary">Downpayment:</span> LKR {Number(inv.data.downpayment_amount).toFixed(2)}</div>
          <div className="col-span-2"><span className="text-text-secondary">Paid so far:</span> <strong className="sf-tabular">LKR {Number(inv.data.paid_amount).toFixed(2)}</strong></div>
          {inv.data.payment_status !== 'PAID' && (
            <div className="col-span-2"><span className="text-text-secondary">Outstanding:</span> <strong className="sf-tabular text-[var(--sf-warning)]">LKR {(Number(inv.data.total_amount) - Number(inv.data.paid_amount)).toFixed(2)}</strong></div>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        {inv.data.payment_status !== 'PAID' && (
          <ActionButton variant="stamp" onClick={() => setRecording(true)}>Record payment</ActionButton>
        )}
        <ActionButton onClick={download} disabled={downloading}>
          {downloading ? 'Downloading…' : 'Download PDF'}
        </ActionButton>
      </div>
      {error && <div className="mt-3"><Notice error>{error}</Notice></div>}

      <div className="mt-6 border-t border-line pt-4">
        <h3 className="mb-3 font-semibold">Payment history</h3>
        <Resource {...payments} retry={payments.reload}>
          {payments.data && payments.data.length === 0
            ? <p className="text-sm text-text-secondary">No payments recorded yet.</p>
            : <div className="space-y-2">{payments.data?.map((p: PaymentRow) => (
                <div key={p.id} className="rounded-docket border border-line bg-paper p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold">LKR {Number(p.amount).toFixed(2)}</span>
                    <span className="text-xs text-text-secondary">{dateTime(p.received_at)}</span>
                  </div>
                  <div className="mt-1 text-xs text-text-secondary">
                    {p.method.replaceAll('_', ' ')}
                    {p.reference && ` · Ref: ${p.reference}`}
                  </div>
                  {p.note && <p className="mt-1 text-xs">{p.note}</p>}
                </div>
              ))}</div>}
        </Resource>
      </div>

      <Modal open={recording} title="Record payment" onClose={() => setRecording(false)}>
        {recording && <RecordPayment
          invoice={inv.data}
          onDone={() => { setRecording(false); inv.reload(); payments.reload(); onChanged() }}
          onCancel={() => setRecording(false)}
        />}
      </Modal>
    </>}
  </Resource>
}

function RecordPayment({ invoice, onDone, onCancel }: {
  invoice: InvoiceRow
  onDone: () => void
  onCancel: () => void
}) {
  const outstanding = Number(invoice.total_amount) - Number(invoice.paid_amount)
  const [amount, setAmount] = useState(outstanding.toFixed(2))
  const [method, setMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CARD_EXTERNAL' | 'OTHER'>('CASH')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault(); if (pending) return
    const num = Number(amount)
    if (!num || num <= 0) { setError('Amount must be greater than 0.'); return }
    if (num > outstanding + 0.001) { setError(`Amount cannot exceed outstanding LKR ${outstanding.toFixed(2)}.`); return }
    setPending(true); setError('')
    try {
      await providerService.recordPayment(invoice.id, {
        amount: num,
        method,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      })
      onDone()
    } catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }

  return <form onSubmit={submit} className="space-y-4">
    <Notice>Outstanding balance: LKR {outstanding.toFixed(2)}</Notice>
    <TextField label="Amount (LKR)" type="number" min={0.01} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
    <SelectField label="Method" value={method} onChange={e => setMethod(e.target.value as typeof method)}>
      <option value="CASH">Cash</option>
      <option value="BANK_TRANSFER">Bank transfer</option>
      <option value="CARD_EXTERNAL">Card (external)</option>
      <option value="OTHER">Other</option>
    </SelectField>
    <TextField label="Reference (optional)" value={reference} onChange={e => setReference(e.target.value)} maxLength={120} />
    <TextAreaField label="Note (optional)" value={note} onChange={e => setNote(e.target.value)} maxLength={2000} />
    {error && <Notice error>{error}</Notice>}
    <div className="flex justify-end gap-2">
      <ActionButton type="button" onClick={onCancel}>Cancel</ActionButton>
      <ActionButton type="submit" variant="stamp" disabled={pending}>{pending ? 'Saving…' : 'Record payment'}</ActionButton>
    </div>
  </form>
}