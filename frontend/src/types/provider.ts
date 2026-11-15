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

export type RequestRow = {
  id: number
  status: string
  description: string
  address: string
  preferred_date: string
  preferred_time?: string | null
  service_id: number
  client_id: number
  created_at?: string
}

export type RequestMessage = {
  id: number
  body: string
  sender_id: number
  created_at: string
}

export type QuotationItem = {
  description: string
  quantity: number
  unit_price: number
}

export type QuotationRow = {
  id: number
  request_id: number
  status: string
  total_amount: number
  valid_until?: string
  items: QuotationItem[]
}