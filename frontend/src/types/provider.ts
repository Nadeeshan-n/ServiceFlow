export type Provider = {
  id: number
  type: string
  name: string
  description?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  verification_status?: string
  accepting_requests?: boolean
}

export type CatalogService = {
  id: number
  name: string
  description?: string | null
  category?: string | null
  is_active: boolean
}

export type ProviderOffering = {
  id: number
  service_id: number
  service_name: string
  description?: string | null
  starting_price: string
  is_active: boolean
  catalog_is_active: boolean
}

export type ServiceArea = { id: number; provider_id: number; area_name: string }

export type WorkingHour = {
  day_of_week: number
  start_time: string | null
  end_time: string | null
  is_closed: boolean
}

export type PolicyRow = {
  id: number
  policy_type: 'SERVICE' | 'WARRANTY' | 'CANCELLATION' | 'PAYMENT' | 'TERMS_AND_CONDITIONS'
  title: string
  visibility: 'PUBLIC' | 'PRIVATE'
  status: 'ACTIVE' | 'INACTIVE'
  created_at: string
  updated_at: string
}

export type RequestRow = {
  id: number
  client_id: number
  provider_id: number
  service_id: number
  description: string
  preferred_date: string
  preferred_time?: string | null
  address: string
  latitude: number
  longitude: number
  status: 'NEW' | 'UNDER_REVIEW' | 'NEED_INFORMATION' | 'QUOTATION_SENT' | 'REJECTED' | 'CANCELLED'
  rejection_reason?: string | null
  cancellation_reason?: string | null
  created_at: string
  updated_at: string
}

export type RequestMessage = {
  id: number
  request_id: number
  sender_user_id: number
  message_text: string
  created_at: string
}

export type QuotationItem = { description: string; quantity: number; unit_price: number }

export type QuotationRow = {
  id: number
  request_id: number
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'EXPIRED'
  subtotal: string
  total_amount: string
  valid_until: string
  downpayment_amount?: string | null
  note?: string | null
  created_at: string
  updated_at: string
  items: {
    id: number
    quotation_id: number
    description: string
    quantity: string
    unit_price: string
    line_total: string
  }[]
  job_id?: number | null
}