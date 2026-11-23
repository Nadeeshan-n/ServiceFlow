import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import { Sparkles, X, Send, Paperclip, FileText, Check, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../app/session'
import { api, apiUpload, ApiError } from '../lib/api'

type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
  citations?: Array<{ source: string; page: number }>
  error?: boolean
  quickActions?: Array<{ label: string; action: 'business' | 'policy' | 'upload' }>
}

type PolicyType = 'SERVICE' | 'WARRANTY' | 'CANCELLATION' | 'PAYMENT' | 'TERMS_AND_CONDITIONS'

const GREETINGS = [
  'hi', 'hello', 'hey', 'helo', 'hiya', 'yo', 'sup',
  'good morning', 'good afternoon', 'good evening',
  'ayubowan', 'hello there', 'hi there', 'hey there',
]

const THANKS = ['thanks', 'thank you', 'thx', 'thnks', 'thank u']

const COMMON_QUESTIONS = [
  'What is the cancellation policy?',
  'What is the arrival window for appointments?',
  'What is the warranty on completed work?',
  'What payment methods are accepted?',
  'How do I request a refund?',
]

const POLICY_TYPES: { value: PolicyType; label: string }[] = [
  { value: 'SERVICE', label: 'Service' },
  { value: 'WARRANTY', label: 'Warranty' },
  { value: 'CANCELLATION', label: 'Cancellation' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'TERMS_AND_CONDITIONS', label: 'Terms & Conditions' },
]

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/[!?.,]/g, '')
}

function isGreeting(text: string): boolean {
  const t = normalize(text)
  return GREETINGS.some(g => t === g || t.startsWith(g + ' '))
}

function isThanks(text: string): boolean {
  const t = normalize(text)
  return THANKS.some(g => t === g || t.startsWith(g + ' '))
}

export function FlowAIBubble() {
  const { user } = useSession()
  const navigate = useNavigate()
  const isProvider = user?.role === 'manager'

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'data' | 'policy'>('data')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [policyUploaded, setPolicyUploaded] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [policyTitle, setPolicyTitle] = useState('')
  const [policyType, setPolicyType] = useState<PolicyType>('SERVICE')
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE')
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open && user && isProvider && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hi ${user.name.split(' ')[0] || 'there'}! 👋 I'm Flow AI. I can help you with:\n\n• Business questions — requests, jobs, invoices, revenue\n• Policy questions — answers from your uploaded policy documents\n\nWhat would you like to do?`,
        quickActions: [
          { label: 'Ask about my business', action: 'business' },
          { label: 'Ask about my policy', action: 'policy' },
          { label: 'Upload a policy PDF', action: 'upload' },
        ],
      }])
    }
  }, [open, user, isProvider, messages.length])

  if (user?.role === 'admin') return null

  function handleBubbleClick() {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }
    setOpen(!open)
  }

  function handleSignIn() {
    navigate('/login', { state: { from: window.location.pathname } })
  }

  function handleQuickAction(action: 'business' | 'policy' | 'upload') {
    if (action === 'business') {
      setMode('data')
      setMessages(m => [...m, {
        role: 'assistant',
        content: 'Great! Ask me anything about your business — like "How many service requests have I received?" or "What is my unpaid invoice total?"',
      }])
    } else if (action === 'policy') {
      setMode('policy')
      if (policyUploaded) {
        setShowSuggestions(true)
        setMessages(m => [...m, {
          role: 'assistant',
          content: 'Sure! Here are some common policy questions you can try:',
        }])
      } else {
        setMessages(m => [...m, {
          role: 'assistant',
          content: 'You haven\'t uploaded a policy yet. Click the 📎 paperclip to upload a policy PDF first, then I can answer questions from it.',
          quickActions: [{ label: 'Upload policy PDF', action: 'upload' }],
        }])
      }
    } else if (action === 'upload') {
      fileRef.current?.click()
    }
  }

  async function send(text?: string) {
    if (!user) {
      handleSignIn()
      return
    }
    if (!isProvider) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: 'Flow AI is only available to provider accounts. If you have questions about a company\'s policy, visit their company profile page.',
        error: true,
      }])
      return
    }
    const question = (text ?? input).trim()
    if (!question || loading) return
    setInput('')
    setShowSuggestions(false)
    setMessages(m => [...m, { role: 'user', content: question }])

    if (isGreeting(question)) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: `Hello! 👋 How can I help you today?\n\nI can answer questions about your business data or policy documents.`,
        quickActions: [
          { label: 'Ask about my business', action: 'business' },
          { label: 'Ask about my policy', action: 'policy' },
          { label: 'Upload a policy PDF', action: 'upload' },
        ],
      }])
      return
    }

    if (isThanks(question)) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: 'You\'re welcome! 😊 Anything else I can help with?',
      }])
      return
    }

    setLoading(true)
    try {
      const endpoint = mode === 'policy' ? '/ai/ask-docs' : '/ai/ask-data'
      const response = await api<{
        status?: string
        answer?: string
        citations?: Array<{ source: string; page: number }>
      }>(endpoint, 'POST', { question }, { timeout: 120000 })

      const answer = response.status === 'insufficient_evidence'
        ? (response.answer || 'Not enough evidence to answer.')
        : (response.answer || 'No answer available.')

      setMessages(m => [...m, {
        role: 'assistant',
        content: answer,
        citations: response.citations,
      }])
    } catch (e) {
      let msg = 'Something went wrong.'
      if (e instanceof ApiError) {
        if (e.status === 502 || e.status === 503) msg = 'Flow AI is unavailable right now. Please try again.'
        else if (e.status === 403) msg = 'Flow AI is only available to provider accounts.'
        else if (e.status === 401) { msg = 'Your session expired. Please sign in again.'; handleSignIn() }
        else if (e.status === 0) msg = 'Cannot reach the server. Check backend is running.'
        else msg = e.message
      }
      setMessages(m => [...m, { role: 'assistant', content: msg, error: true }])
    } finally {
      setLoading(false)
    }
  }

  function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!user) { handleSignIn(); return }
    if (!isProvider) {
      setMessages(m => [...m, { role: 'assistant', content: 'Only provider accounts can upload policies.', error: true }])
      return
    }
    if (file.type !== 'application/pdf') {
      setMessages(m => [...m, { role: 'assistant', content: 'Only PDF files can be uploaded.', error: true }])
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessages(m => [...m, { role: 'assistant', content: 'PDF must be 5 MB or smaller.', error: true }])
      return
    }
    setPendingFile(file)
    setPolicyTitle(file.name.replace(/\.pdf$/i, ''))
    setPolicyType('SERVICE')
    setVisibility('PRIVATE')
    setShowUploadDialog(true)
  }

  async function confirmUpload() {
    if (!pendingFile || !policyTitle.trim()) return
    setUploading(true)
    setShowUploadDialog(false)
    setMessages(m => [...m, { role: 'system', content: `Uploading ${pendingFile.name}…` }])
    try {
      const form = new FormData()
      form.append('file', pendingFile)
      form.append('title', policyTitle.trim())
      form.append('policy_type', policyType)
      form.append('visibility', visibility)
      await apiUpload('/policies/upload', form)
      setPolicyUploaded(true)
      setMode('policy')
      setShowSuggestions(true)
      setMessages(m => [
        ...m.filter(x => !(x.role === 'system' && x.content.startsWith('Uploading'))),
        { role: 'assistant', content: `✓ Policy "${policyTitle}" uploaded. I can now answer questions from it — try one of the suggestions below or ask your own.` },
      ])
    } catch (e) {
      let msg = 'Upload failed.'
      if (e instanceof ApiError) {
        if (e.status === 404) msg = 'Policy upload endpoint not found.'
        else if (e.status === 409) msg = 'An active policy of this type already exists. Deactivate it first or choose a different type.'
        else if (e.status === 403) msg = 'Only providers can upload policies.'
        else if (e.status === 422) msg = 'Please check the file and try again.'
        else msg = e.message
      }
      setMessages(m => [
        ...m.filter(x => !(x.role === 'system' && x.content.startsWith('Uploading'))),
        { role: 'assistant', content: msg, error: true },
      ])
    } finally {
      setUploading(false)
      setPendingFile(null)
      setPolicyTitle('')
    }
  }

  function cancelUpload() {
    setShowUploadDialog(false)
    setPendingFile(null)
    setPolicyTitle('')
  }

  return (
    <>
      <button
        onClick={handleBubbleClick}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 h-14 w-14 rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform bg-signal text-ink"
        aria-label={open ? 'Close Flow AI' : 'Open Flow AI'}
        title={user ? (isProvider ? 'Flow AI' : 'Flow AI (provider only)') : 'Sign in to use Flow AI'}
      >
        {open ? <X size={22} /> : user && isProvider ? <Sparkles size={22} /> : <Lock size={22} />}
      </button>

      {open && (
        <div className="fixed z-40 bottom-36 md:bottom-24 right-4 left-4 md:left-auto md:right-6 md:w-96 rounded-2xl shadow-2xl flex flex-col h-[32rem] max-h-[calc(100vh-10rem)] bg-paper border border-line text-foreground">
          <div className="p-3 border-b border-line">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="text-signal" size={18} />
              <h3 className="font-bold text-sm text-foreground">Flow AI</h3>
              {policyUploaded && (
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 bg-[var(--sf-success-bg)] text-[var(--sf-success)]">
                  <Check size={11} /> Policy loaded
                </span>
              )}
            </div>
            {user && (
              <p className="text-[11px] mb-2 text-text-secondary">
                Signed in as <strong className="text-foreground">{user.name}</strong> ({user.role})
              </p>
            )}
            <div className="flex gap-1">
              <button
                onClick={() => setMode('data')}
                className={`text-xs px-2 py-1 rounded font-medium ${
                  mode === 'data'
                    ? 'bg-signal text-ink'
                    : 'bg-paper text-text-secondary border border-line'
                }`}
              >
                Business
              </button>
              <button
                onClick={() => setMode('policy')}
                className={`text-xs px-2 py-1 rounded font-medium ${
                  mode === 'policy'
                    ? 'bg-signal text-ink'
                    : 'bg-paper text-text-secondary border border-line'
                }`}
              >
                Policy
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {!user && (
              <div className="text-center py-12 px-4">
                <Lock className="mx-auto mb-3 text-signal" size={32} />
                <h4 className="font-semibold mb-2 text-foreground">Sign in required</h4>
                <p className="text-xs mb-4 text-text-secondary">
                  Flow AI is available only to signed-in users. Please sign in to continue.
                </p>
                <button
                  onClick={handleSignIn}
                  className="inline-block px-5 py-2 rounded-lg text-sm font-semibold bg-signal text-ink"
                >
                  Sign in
                </button>
              </div>
            )}

            {user && !isProvider && messages.length === 0 && (
              <div className="text-center py-12 px-4">
                <Lock className="mx-auto mb-3 text-signal" size={32} />
                <h4 className="font-semibold mb-2 text-foreground">Provider-only feature</h4>
                <p className="text-xs mb-2 text-text-secondary">
                  Flow AI is available to provider accounts only.
                </p>
                <p className="text-xs text-text-secondary">
                  For policy questions, visit the company profile page.
                </p>
              </div>
            )}

            {messages.map((m, i) => {
              if (m.role === 'system') {
                return (
                  <div key={i} className="text-xs text-center py-1 italic text-text-secondary">
                    {m.content}
                  </div>
                )
              }
              const isUser = m.role === 'user'
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] p-2.5 rounded-lg text-sm ${
                      isUser
                        ? 'bg-graphite text-white'
                        : m.error
                          ? 'border border-[var(--sf-error)] bg-[var(--sf-error-bg)] text-[var(--sf-error)]'
                          : 'bg-paper border border-line text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.citations && m.citations.length > 0 && (
                      <div className={`mt-2 space-y-1 pt-2 ${isUser ? 'border-t border-white/20' : 'border-t border-line'}`}>
                        {m.citations.map((c, j) => (
                          <p key={j} className="text-[11px] opacity-85">
                            📄 {c.source} · p.{c.page}
                          </p>
                        ))}
                      </div>
                    )}
                    {m.quickActions && m.quickActions.length > 0 && (
                      <div className="mt-3 flex flex-col gap-1.5">
                        {m.quickActions.map((qa, j) => (
                          <button
                            key={j}
                            onClick={() => handleQuickAction(qa.action)}
                            className="text-left text-xs px-3 py-2 rounded-lg font-medium border border-signal text-signal bg-paper hover:bg-signal hover:text-ink transition"
                          >
                            → {qa.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="p-2.5 rounded-lg text-sm bg-paper border border-line text-text-secondary">
                  Thinking…
                </div>
              </div>
            )}

            {showSuggestions && isProvider && (
              <div className="pt-2">
                <p className="text-[11px] mb-2 font-semibold text-text-secondary">Try asking:</p>
                <div className="flex flex-col gap-1.5">
                  {COMMON_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-left text-xs px-3 py-2 rounded-lg bg-paper border border-line text-foreground hover:bg-signal hover:text-ink transition"
                      disabled={loading}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {showUploadDialog && pendingFile && (
            <div className="p-3 space-y-2 border-t border-line bg-paper">
              <p className="text-xs font-semibold text-foreground">Upload policy: {pendingFile.name}</p>
              <div>
                <label className="block text-[11px] mb-1 text-text-secondary">Title</label>
                <input
                  value={policyTitle}
                  onChange={e => setPolicyTitle(e.target.value)}
                  className="w-full px-2 py-1.5 rounded text-sm focus:outline-none sf-input"
                  maxLength={255}
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] mb-1 text-text-secondary">Policy type</label>
                <select
                  value={policyType}
                  onChange={e => setPolicyType(e.target.value as PolicyType)}
                  className="w-full px-2 py-1.5 rounded text-sm focus:outline-none sf-input"
                >
                  {POLICY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] mb-1 text-text-secondary">Visibility</label>
                <select
                  value={visibility}
                  onChange={e => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')}
                  className="w-full px-2 py-1.5 rounded text-sm focus:outline-none sf-input"
                >
                  <option value="PRIVATE">Private (only you)</option>
                  <option value="PUBLIC">Public (visible to clients)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={cancelUpload}
                  className="flex-1 px-3 py-1.5 rounded text-sm border border-line bg-paper text-foreground"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUpload}
                  className="flex-1 px-3 py-1.5 rounded text-sm font-semibold bg-signal text-ink disabled:opacity-40"
                  disabled={uploading || !policyTitle.trim()}
                >
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </div>
          )}

          {!user ? (
            <div className="p-3 border-t border-line text-center">
              <button
                onClick={handleSignIn}
                className="w-full px-4 py-2 rounded-lg text-sm font-semibold bg-signal text-ink"
              >
                Sign in to chat
              </button>
            </div>
          ) : !isProvider ? (
            <div className="p-3 border-t border-line text-center text-xs text-text-secondary">
              Flow AI is provider-only
            </div>
          ) : (
            <div className="p-2 border-t border-line flex gap-2 items-center">
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={pickFile}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading || loading}
                className="p-2 rounded-lg disabled:opacity-40 text-signal hover:bg-line/20"
                aria-label="Upload PDF"
                title="Upload policy PDF"
              >
                <Paperclip size={16} />
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder={mode === 'policy' ? 'Ask about policy…' : 'Ask about business…'}
                className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none sf-input"
                disabled={loading || uploading}
              />
              <button
                onClick={() => send()}
                disabled={loading || uploading || !input.trim()}
                className="px-3 py-2 rounded-lg flex items-center justify-center disabled:opacity-40 bg-signal text-ink"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}