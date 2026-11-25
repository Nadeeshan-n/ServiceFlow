// Normalise Flow AI citations into one display string.
//
// The API returns a different citation shape per endpoint, and neither one
// matches the `{ source, page }` shape the UI used to assume:
//   ask-docs: { document_name, section_title, page_number, ... }
//   ask-data: { tool, type: 'query_count', total_count } /
//             { tool, type: 'record', record_id }
// Rendering those shapes as `c.source` / `c.page` produced the blank
// "📄 · p." chips seen in the 2026-11-25 live Flow AI test. This maps every
// known shape to one display string and returns null when a citation has
// nothing worth showing, so no blank chip is ever rendered.

export type ApiCitation = {
  document_name?: string
  section_title?: string
  page_number?: number
  tool?: string
  type?: string
  total_count?: number
  record_id?: number
  // Legacy shape, tolerated so older callers keep working.
  source?: string
  page?: number
}

const TOOL_LABELS: Record<string, string> = {
  get_requests: 'Service requests',
  get_quotations: 'Quotations',
  get_jobs: 'Jobs',
  get_unpaid_invoices: 'Unpaid invoices',
}

function toolLabel(tool?: string): string {
  return (tool && TOOL_LABELS[tool]) || 'Business data'
}

export function formatCitation(c: ApiCitation): string | null {
  // Policy-document citation (ask-docs).
  const doc = c.document_name || c.section_title || c.source
  if (doc) {
    const page = c.page_number ?? c.page
    return page != null ? `${doc} · p.${page}` : doc
  }
  // Business-data citation (ask-data).
  if (c.tool) {
    const label = toolLabel(c.tool)
    if (c.type === 'query_count' && typeof c.total_count === 'number') {
      return `${label} · ${c.total_count} record${c.total_count === 1 ? '' : 's'}`
    }
    if (c.type === 'record' && typeof c.record_id === 'number') {
      return `${label} · record #${c.record_id}`
    }
    return label
  }
  return null
}
