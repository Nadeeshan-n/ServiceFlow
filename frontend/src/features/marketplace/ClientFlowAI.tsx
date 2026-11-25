import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ActionButton, FlowAIPanel, TextAreaField } from '../../components'
import { Notice } from '../../components/client-shared'
import { useSession } from '../../app/session'
import { clientService } from '../../lib/client-service'
import { formatCitation } from '../../lib/citations'
import { demoMode } from '../../lib/api'
import type { PolicyAnswer } from '../../types/client'

export function ClientFlowAI({ companyId }: { companyId: string }) {
  const { user } = useSession()
  const [question, setQuestion] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [answer, setAnswer] = useState<PolicyAnswer>()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function ask(event: FormEvent) {
    event.preventDefault()
    if (pending || !question.trim()) return
    setPending(true)
    setError('')
    setAnswer(undefined)
    setSubmitted(question.trim())
    try { setAnswer(await clientService.ask(companyId, question.trim())) }
    catch (cause) { setError((cause as Error).message) }
    finally { setPending(false) }
  }
  const cited = answer?.status === 'ANSWERED' && answer.citations.length > 0
  return <div className="space-y-5">
    <h2 className="sf-display text-xl font-semibold">Ask Flow AI</h2>
    <p className="text-sm text-text-secondary">Answers come from the selected company’s public policy PDF and include policy page citations.</p>
    {demoMode && <Notice>Flow AI is available in demo mode only. Client access to the policy assistant has not been agreed yet.</Notice>}
    {(demoMode ? user?.role === 'client' : !!user) ? <form onSubmit={ask} className="space-y-4">
      <TextAreaField label="Your policy question" required maxLength={1000} value={question} onChange={event => setQuestion(event.target.value)} />
      <ActionButton type="submit" variant="stamp" disabled={pending || !question.trim()}>{pending ? 'Checking policy…' : 'Ask question'}</ActionButton>
    </form> : <Link className="sf-link" to="/login">Sign in as a client to ask →</Link>}
    {error && <Notice error>{error}</Notice>}
    {pending && <FlowAIPanel question={submitted} loading />}
    {answer && <>
      <FlowAIPanel question={submitted} answer={answer.status === 'ANSWERED' && !cited ? 'The policy response did not include evidence. Please try again or open the public policy.' : answer.answer} source={cited ? answer.citations[0].title : undefined} page={cited ? answer.citations[0].page : undefined} />
      {cited && answer.citations.map(citation => <PolicyCitation key={`${citation.policy_id}-${citation.page}`} companyId={companyId} citation={citation} />)}
    </>}
  </div>
}

function PolicyCitation({ companyId, citation }: { companyId: string; citation: PolicyAnswer['citations'][number] }) {
  const label = formatCitation({ document_name: citation.title, page_number: citation.page }) || citation.title
  return <button type="button" className="sf-link block text-left text-sm" onClick={() => void clientService.downloadPolicy(companyId, citation.policy_id, citation.title)}>📄 {label} — download the policy PDF</button>
}
