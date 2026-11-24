import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FileSearch, MessageCircleQuestion, Send, Sparkles } from 'lucide-react'
import { matchPolicy, presetQuestions } from './data'

type Message = { role: 'user' | 'ai'; text: string; source?: string; page?: number }

export function FlowAIChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Ask me anything about the BrightFix service policy — I only answer from the document, and I will say so when it does not cover your question.', source: 'BrightFix Service Policy', page: 1 },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  function ask(question: string) {
    const trimmed = question.trim()
    if (!trimmed || thinking) return
    setMessages(current => [...current, { role: 'user', text: trimmed }])
    setInput('')
    setThinking(true)
    window.setTimeout(() => {
      const reply = matchPolicy(trimmed)
      setMessages(current => [...current, { role: 'ai', text: reply.answer, source: reply.source, page: reply.page }])
      setThinking(false)
    }, 650)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    ask(input)
  }

  return <div className="sf-chat">
    <div className="sf-chat-head">
      <Sparkles size={17} aria-hidden="true" />
      <strong>Flow AI · BrightFix policy demo</strong>
      <span className="sf-mono text-[10px]">SAMPLE</span>
    </div>

    <div className="sf-chat-log" ref={scrollRef} aria-live="polite">
      {messages.map((message, index) => (
        <div key={index} className={`sf-chat-msg ${message.role === 'user' ? 'is-user' : 'is-ai'}`}>
          <p>{message.role === 'user' ? <MessageCircleQuestion size={14} className="mr-1 inline" aria-hidden="true" /> : <Sparkles size={14} className="mr-1 inline" aria-hidden="true" />}{message.text}</p>
          {message.source && <span className="sf-chat-source"><FileSearch size={12} aria-hidden="true" /> Source: {message.source} · Page {message.page}</span>}
        </div>
      ))}
      {thinking && <div className="sf-chat-msg is-ai"><p className="sf-chat-thinking">Checking the policy document<span>.</span><span>.</span><span>.</span></p></div>}
    </div>

    <div className="sf-chat-presets">
      {presetQuestions.map(question => (
        <button key={question} type="button" onClick={() => ask(question)}>{question}</button>
      ))}
    </div>

    <form className="sf-chat-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="flowai-question">Ask the policy a question</label>
      <input id="flowai-question" type="text" value={input} onChange={event => setInput(event.target.value)} placeholder="Try: “Do you offer a lifetime warranty?”" />
      <button type="submit" className="sf-stamp-button" disabled={!input.trim() || thinking}><Send size={15} aria-hidden="true" /> Ask</button>
    </form>
  </div>
}
