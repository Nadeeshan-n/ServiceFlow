import { api, apiUpload, apiBlob } from './api'
import type {
  CatalogService, PolicyRow, Provider, ProviderOffering,
  ServiceArea, WorkingHour,
  RequestRow, RequestMessage, QuotationItem, QuotationRow,
  InvoiceRow, PaymentRow,
  JobRow, JobDetailRow, EmployeeRow,
} from '../types/provider'

export const providerService = {
  // ---- Provider profile ----
  getProfile: () => api<Provider>('/providers/me'),
  updateProfile: (body: Partial<Provider>) => api<Provider>('/providers/me', 'PATCH', body),

  // ---- Offerings ----
  listCatalogServices: () => api<CatalogService[]>('/services'),
  listMyOfferings: () => api<ProviderOffering[]>('/provider/me/services'),
  createOffering: (body: { service_id: number; starting_price: number; description?: string }) =>
    api<ProviderOffering>('/provider/me/services', 'POST', body),
  updateOffering: (id: number, body: { starting_price?: number; description?: string; is_active?: boolean }) =>
    api<ProviderOffering>(`/provider/me/services/${id}`, 'PATCH', body),

  // ---- Service areas ----
  listServiceAreas: async (): Promise<ServiceArea[]> => {
    const r = await api<{ service_areas: ServiceArea[] }>('/providers/me/service-areas')
    return r.service_areas
  },
  createServiceArea: (area_name: string) =>
    api<ServiceArea>('/providers/me/service-areas', 'POST', { area_name }),
  deleteServiceArea: (id: number) =>
    api<void>(`/providers/me/service-areas/${id}`, 'DELETE'),

  // ---- Working hours ----
  getWorkingHours: async (): Promise<WorkingHour[]> => {
    const r = await api<{ working_hours: WorkingHour[] }>('/providers/me/working-hours')
    return r.working_hours
  },
  saveWorkingHours: async (hours: WorkingHour[]): Promise<WorkingHour[]> => {
    const r = await api<{ working_hours: WorkingHour[] }>(
      '/providers/me/working-hours', 'PUT', { working_hours: hours },
    )
    return r.working_hours
  },

  // ---- Policies ----
  uploadPolicy: (form: FormData) => apiUpload('/policies/upload', form),
  listMyPolicies: () => api<PolicyRow[]>('/policies/me'),
  deletePolicy: (id: number) => api<void>(`/policies/${id}`, 'DELETE'),
  activatePolicy: (id: number) => api<PolicyRow>(`/policies/${id}/activate`, 'PATCH'),

  // ---- Requests ----
  listIncomingRequests: (status?: string) =>
    api<{ items: RequestRow[]; total: number; limit: number; offset: number }>(
      `/requests${status ? `?status=${status}` : ''}`,
    ),
  getRequest: (id: number) => api<RequestRow>(`/requests/${id}`),
  reviewRequest: (id: number) => api(`/requests/${id}/review`, 'POST'),
  requestInformation: (id: number, message_text: string) =>
    api(`/requests/${id}/request-information`, 'POST', { message_text }),
  rejectRequest: (id: number, reason: string) =>
    api(`/requests/${id}/reject`, 'POST', { reason }),

  // ---- Messages ----
  listMessages: async (id: number): Promise<RequestMessage[]> => {
    const r = await api<{ items: RequestMessage[]; total: number }>(`/requests/${id}/messages`)
    return r.items
  },
  sendMessage: (id: number, message_text: string) =>
    api<RequestMessage>(`/requests/${id}/messages`, 'POST', { message_text }),

  // ---- Quotations ----
  listQuotations: (requestId: number) =>
    api<QuotationRow[]>(`/requests/${requestId}/quotations`),
  createQuotation: (requestId: number, body: {
    items: QuotationItem[]
    valid_until: string
    downpayment_amount?: number
    note?: string
  }) => api<QuotationRow>(`/requests/${requestId}/quotations`, 'POST', body),
  updateQuotation: (id: number, body: {
    items?: QuotationItem[]
    valid_until?: string
    downpayment_amount?: number | null
    note?: string | null
  }) => api<QuotationRow>(`/quotations/${id}`, 'PATCH', body),
  sendQuotation: (quotationId: number) =>
    api<QuotationRow>(`/quotations/${quotationId}`, 'PATCH', { status: 'SENT' }),

  // ---- Jobs ----
  listJobs: (params?: { status?: string; schedule_status?: string }) => {
    const sp = new URLSearchParams()
    if (params?.status) sp.set('status', params.status)
    if (params?.schedule_status) sp.set('schedule_status', params.schedule_status)
    const qs = sp.toString() ? `?${sp.toString()}` : ''
    return api<{ items: JobRow[]; total: number; limit: number; offset: number }>(`/jobs${qs}`)
  },
  getJob: (id: number) => api<JobDetailRow>(`/jobs/${id}`),
  assignEmployee: (jobId: number, employeeId: number) =>
    api<JobRow>(`/jobs/${jobId}/assign`, 'POST', { employee_id: employeeId }),
  proposeSchedule: (jobId: number, schedule_date: string, schedule_time: string) =>
    api<JobRow>(`/jobs/${jobId}/schedule`, 'POST', { schedule_date, schedule_time }),

  // ---- Employees ----
  listEmployees: () => api<EmployeeRow[]>('/company/employees'),

  // ---- Invoices ----
  listInvoices: () =>
    api<{ items: InvoiceRow[]; total: number; limit: number; offset: number }>('/invoices'),
  getInvoice: (id: number) => api<InvoiceRow>(`/invoices/${id}`),
  listPayments: async (invoiceId: number): Promise<PaymentRow[]> => {
    const r = await api<{ items: PaymentRow[]; total: number }>(`/invoices/${invoiceId}/payments`)
    return r.items
  },
  recordPayment: (invoiceId: number, body: {
    amount: number
    method: 'CASH' | 'BANK_TRANSFER' | 'CARD_EXTERNAL' | 'OTHER'
    reference?: string
    note?: string
  }) => api<PaymentRow>(`/invoices/${invoiceId}/payments`, 'POST', body),
  downloadInvoicePdf: async (id: number) => {
    const blob = await apiBlob(`/invoices/${id}/pdf`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${id}.pdf`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
}