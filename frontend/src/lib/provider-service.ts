import { api, apiUpload } from './api'
import type {
  CatalogService, PolicyRow, Provider, ProviderOffering,
  ServiceArea, WorkingHour,
  RequestRow, RequestMessage, QuotationItem, QuotationRow,
} from '../types/provider'

type Wrapped<T> = { [K in keyof T]: T[K] }

export const providerService = {
  getProfile: () => api<Provider>('/providers/me'),
  updateProfile: (body: Partial<Provider>) => api<Provider>('/providers/me', 'PATCH', body),

  listCatalogServices: () => api<CatalogService[]>('/services'),
  listMyOfferings: () => api<ProviderOffering[]>('/provider/me/services'),
  createOffering: (body: { service_id: number; starting_price: number; description?: string }) =>
    api<ProviderOffering>('/provider/me/services', 'POST', body),
  updateOffering: (id: number, body: { starting_price?: number; description?: string; is_active?: boolean }) =>
    api<ProviderOffering>(`/provider/me/services/${id}`, 'PATCH', body),

  listServiceAreas: async (): Promise<ServiceArea[]> => {
    const r = await api<{ service_areas: ServiceArea[] }>('/providers/me/service-areas')
    return r.service_areas
  },
  createServiceArea: (area_name: string) =>
    api<ServiceArea>('/providers/me/service-areas', 'POST', { area_name }),
  deleteServiceArea: (id: number) =>
    api<void>(`/providers/me/service-areas/${id}`, 'DELETE'),

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
  sendQuotation: (quotationId: number) =>
    api<QuotationRow>(`/quotations/${quotationId}`, 'PATCH', { status: 'SENT' }),
}