import { api, apiUpload } from './api'
import type {
  CatalogService, PolicyUploadResult, Provider, ProviderOffering,
  ServiceArea, WorkingHour,
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
}