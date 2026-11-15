import { api, apiUpload } from './api'
import type {
  CatalogService, PolicyUploadResult, Provider, ProviderOffering,
  ServiceArea, WorkingHour,
  RequestRow, RequestMessage, QuotationItem, QuotationRow,
} from '../types/provider'

export const providerService = {
  getProfile: () => api<Provider>('/providers/me'),
  updateProfile: (body: Partial<Provider>) => api<Provider>('/providers/me', 'PATCH', body),

  listCatalogServices: () => api<CatalogService[]>('/services'),
  listMyOfferings: () => api<ProviderOffering[]>('/provider/me/services'),
  createOffering: (body: { service_id: number; starting_price: number; description?: string }) =>
    api<ProviderOffering>('/provider/me/services', 'POST', body),
  updateOffering: (id: number, body: { starting_price?: number; description?: string }) =>
    api<ProviderOffering>(`/provider/me/services/${id}`, 'PATCH', body),

  listServiceAreas: () => api<ServiceArea[]>('/providers/me/service-areas'),
  createServiceArea: (name: string) =>
    api<ServiceArea>('/providers/me/service-areas', 'POST', { name }),
  deleteServiceArea: (id: number) =>
    api<void>(`/providers/me/service-areas/${id}`, 'DELETE'),

  getWorkingHours: () => api<WorkingHour[]>('/providers/me/working-hours'),
  saveWorkingHours: (hours: WorkingHour[]) =>
    api<WorkingHour[]>('/providers/me/working-hours', 'PUT', hours),

  uploadPolicy: (form: FormData) => apiUpload<PolicyUploadResult>('/policies/upload', form),

  // ---- Requests ----
  listIncomingRequests: (status?: string) =>
    api<{ items: RequestRow[]; total: number }>(`/requests${status ? `?status=${status}` : ''}`),
  getRequest: (id: number) => api<RequestRow>(`/requests/${id}`),
  reviewRequest: (id: number) => api(`/requests/${id}/review`, 'POST'),
  requestInformation: (id: number, body: string) =>
    api(`/requests/${id}/request-information`, 'POST', { message: body }),
  rejectRequest: (id: number, reason: string) =>
    api(`/requests/${id}/reject`, 'POST', { reason }),

  // ---- Messages ----
  listMessages: (id: number) => api<RequestMessage[]>(`/requests/${id}/messages`),
  sendMessage: (id: number, body: string) =>
    api(`/requests/${id}/messages`, 'POST', { body }),

  // ---- Quotations ----
  listQuotations: (requestId: number) =>
    api<QuotationRow[]>(`/requests/${requestId}/quotations`),
  createQuotation: (requestId: number, body: {
    items: QuotationItem[]
    valid_until: string
    downpayment_amount?: number
  }) => api<QuotationRow>(`/requests/${requestId}/quotations`, 'POST', body),
  sendQuotation: (quotationId: number) =>
    api(`/quotations/${quotationId}`, 'PATCH', { status: 'SENT' }),
}