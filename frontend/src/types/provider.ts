export type Provider = {
  id: number
  name: string
  description?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  type?: 'INDIVIDUAL' | 'COMPANY' | string
}

export type CatalogService = {
  id: number
  name: string
  description?: string | null
  category?: string | null
  active?: boolean
}

export type ProviderOffering = {
  id: number
  service_id: number
  service_name: string
  description?: string | null
  starting_price: number
}

export type ServiceArea = { id: number; name: string }

export type WorkingHour = {
  day_of_week: number
  start_time: string | null
  end_time: string | null
}

export type PolicyUploadResult = {
  id?: number
  message?: string
  status?: string
}