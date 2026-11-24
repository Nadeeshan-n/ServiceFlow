// Sample data + pure logic for the interactive landing page.
// Everything here is front-end only: no API calls, no storage.
// Sample figures are labelled as samples wherever they are shown.

export type Trade = {
  id: string
  name: string
  jobTitle: string
  fee: number
  callout: number
}

export const trades: Trade[] = [
  { id: 'plumbing', name: 'Plumbing', jobTitle: 'Plumbing Inspection', fee: 2500, callout: 500 },
  { id: 'electrical', name: 'Electrical', jobTitle: 'Electrical Inspection', fee: 3000, callout: 500 },
  { id: 'cleaning', name: 'Cleaning', jobTitle: 'Home Deep Clean', fee: 4500, callout: 500 },
  { id: 'vehicle', name: 'Vehicle Repairs', jobTitle: 'Vehicle Inspection', fee: 3500, callout: 750 },
  { id: 'appliance', name: 'Appliance Repair', jobTitle: 'Appliance Repair Visit', fee: 2800, callout: 500 },
  { id: 'painting', name: 'Painting', jobTitle: 'Painting Site Visit', fee: 2000, callout: 500 },
]

export const AFTER_HOURS_FEE = 1500

export const stages = ['Request', 'Quoted', 'Approved', 'Scheduled', 'Done'] as const

export type LabState = {
  tradeId: string
  providerName: string
  stage: number
  afterHours: boolean
  docket: string
  estimate: { tradeId: string; total: number } | null
}

export const initialLab: LabState = {
  tradeId: 'plumbing',
  providerName: 'BrightFix',
  stage: 1,
  afterHours: false,
  docket: 'SF-JOB-2087',
  estimate: null,
}

export function labTotal(lab: LabState): { lines: { label: string; amount: number }[]; total: number } {
  if (lab.estimate && lab.estimate.tradeId === lab.tradeId) {
    return { lines: [{ label: 'Estimator total (sample)', amount: lab.estimate.total }], total: lab.estimate.total }
  }
  const trade = trades.find(item => item.id === lab.tradeId) ?? trades[0]
  const lines = [
    { label: trade.id === 'plumbing' ? 'Inspection fee' : 'Service fee', amount: trade.fee },
    { label: 'Call-out', amount: trade.callout },
  ]
  if (lab.afterHours) lines.push({ label: 'After-hours', amount: AFTER_HOURS_FEE })
  return { lines, total: lines.reduce((sum, line) => sum + line.amount, 0) }
}

export function randomDocket(): string {
  return `SF-JOB-${2000 + Math.floor(Math.random() * 7999)}`
}

// Deterministic-ish barcode pattern from a seed string, so regenerating the
// docket visibly changes the barcode.
export function barcodePattern(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 9973
  const bars: string[] = []
  let x = 0
  for (let i = 0; i < 22; i++) {
    hash = (hash * 37 + 11) % 9973
    const w = 1 + (hash % 3)
    bars.push(`var(--sf-ink) ${x}px ${x + w}px`, `transparent ${x + w}px ${x + w + 2}px`)
    x += w + 2
  }
  return `repeating-linear-gradient(90deg, ${bars.join(',')})`
}

// ---- Live Docket Board (sample jobs) ----

export type BoardJob = {
  key: string
  id: string
  service: string
  client: string
  amount: number
  column: number // 0 Requests · 1 Quoted · 2 Scheduled · 3 Done
  invoice?: string
}

export const boardColumns = ['Requests', 'Quoted', 'Scheduled', 'Done'] as const

export const seedBoard: BoardJob[] = [
  { key: 'b1', id: 'SF-JOB-2041', service: 'Leak assessment', client: 'Amaya Perera', amount: 4200, column: 0 },
  { key: 'b2', id: 'SF-JOB-2055', service: 'AC servicing', client: 'Ruwan Silva', amount: 5000, column: 0 },
  { key: 'b3', id: 'SF-JOB-2036', service: 'Electrical maintenance', client: 'Nimal Fernando', amount: 4500, column: 1 },
  { key: 'b4', id: 'SF-JOB-2019', service: 'Plumbing inspection', client: 'Sithum Bandara', amount: 3000, column: 2 },
  { key: 'b5', id: 'SF-JOB-1998', service: 'Home deep clean', client: 'Kavya Dias', amount: 5000, column: 3, invoice: 'SF-INV-1042' },
]

// ---- Price Estimator (sample rates) ----

export const estimatorAddons = [
  { id: 'extra-room', label: 'Extra room / area', amount: 1200 },
  { id: 'materials', label: 'Priority materials sourcing', amount: 1800 },
  { id: 'finish', label: 'Premium finish & cleanup', amount: 900 },
] as const

export const LABOUR_PER_HOUR = 1500

export const urgencyOptions = [
  { id: 'standard', label: 'Standard', multiplier: 1 },
  { id: 'priority', label: 'Priority (×1.25)', multiplier: 1.25 },
  { id: 'emergency', label: 'Emergency (×1.5)', multiplier: 1.5 },
] as const

// ---- Flow AI demo (rule-based matcher over one sample policy) ----

export type PolicyReply = { answer: string; source?: string; page?: number }

const POLICY_SOURCE = 'BrightFix Service Policy'

export function matchPolicy(question: string): PolicyReply {
  const q = question.toLowerCase()
  if (/(call[-\s]?out|callout)/.test(q)) {
    return { answer: 'The call-out fee for a basic inspection is LKR 500, charged once per visit.', source: POLICY_SOURCE, page: 2 }
  }
  if (/(inspection|basic).*(fee|price|cost|much)|how much/.test(q)) {
    return { answer: 'The basic inspection is LKR 3,000 in total: an inspection fee of LKR 2,500 plus a call-out fee of LKR 500.', source: POLICY_SOURCE, page: 2 }
  }
  if (/(cancel|reschedule|change).*(appointment|booking|visit)|cancel/.test(q)) {
    return { answer: 'Appointments can be rescheduled free of charge up to 4 hours before the scheduled time. Later changes are treated as a new booking.', source: POLICY_SOURCE, page: 4 }
  }
  if (/(pay|payment|invoice)/.test(q)) {
    return { answer: 'Payment is made offline after the job is complete. The platform records the payment status on the invoice — it does not process payments itself.', source: POLICY_SOURCE, page: 5 }
  }
  if (/(area|areas|cover|colombo|location|where)/.test(q)) {
    return { answer: 'BrightFix currently serves Colombo and Nugegoda for inspections and household maintenance.', source: POLICY_SOURCE, page: 1 }
  }
  return { answer: 'The uploaded policy document does not provide enough evidence to answer this question.' }
}

export const presetQuestions = [
  'What is the call-out fee for a basic inspection?',
  'Can I reschedule my appointment?',
  'Do you offer a lifetime warranty on repairs?',
]
