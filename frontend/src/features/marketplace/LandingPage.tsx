import { Link } from 'react-router-dom'
import { ArrowRight, Building2, CalendarCheck, ClipboardCheck, Wrench } from 'lucide-react'
import { SurfaceCard } from '../../components'
import { destination, useSession } from '../../app/session'
import type { Role } from '../../types/client'

const roleContent: Record<Role, {
  eyebrow: string
  description: string
  cardTitle: string
  steps: [string, string, string]
  note: string
  sectionTitle: string
  highlights: { icon: typeof Building2; title: string; text: string }[]
}> = {
  client: {
    eyebrow: 'YOUR SERVICEFLOW WORKSPACE',
    description: 'Keep up with your service requests, quotations, appointments and invoices.',
    cardTitle: 'Your service journey.',
    steps: ['Check request updates', 'Review quotations and appointments', 'Track jobs and invoices'],
    note: 'Your requests and service details are ready when you need them.',
    sectionTitle: 'Everything for your services',
    highlights: [
      { icon: ClipboardCheck, title: 'Requests', text: 'Follow every request from submission to completion.' },
      { icon: CalendarCheck, title: 'Quotations & jobs', text: 'Review prices and appointments before work begins.' },
      { icon: Building2, title: 'Invoices', text: 'Find your service invoices in one place.' },
    ],
  },
  manager: {
    eyebrow: 'YOUR COMPANY WORKSPACE',
    description: 'Manage customer requests, quotations and day-to-day service operations.',
    cardTitle: 'Keep work moving.',
    steps: ['Review incoming requests', 'Prepare and follow up on quotations', 'Manage jobs, schedules and your team'],
    note: 'Your company operations are together in one workspace.',
    sectionTitle: 'Run your service business',
    highlights: [
      { icon: ClipboardCheck, title: 'Requests', text: 'Review customer requests and respond with the next steps.' },
      { icon: CalendarCheck, title: 'Quotations & jobs', text: 'Create quotations and keep accepted work moving.' },
      { icon: Building2, title: 'Your team', text: 'Manage schedules, invoices and company details.' },
    ],
  },
  employee: {
    eyebrow: 'YOUR WORKSPACE',
    description: 'See your assigned work and keep job progress up to date.',
    cardTitle: 'Your workday.',
    steps: ['Check assigned jobs', 'Review job details and schedules', 'Update progress as work moves along'],
    note: 'Your assigned work is available from your dashboard.',
    sectionTitle: 'Stay on top of your work',
    highlights: [
      { icon: ClipboardCheck, title: 'Assigned jobs', text: 'See the jobs assigned to you.' },
      { icon: CalendarCheck, title: 'Schedules', text: 'Check proposed and confirmed appointments.' },
      { icon: Wrench, title: 'Job progress', text: 'Keep job statuses current as you work.' },
    ],
  },
  admin: {
    eyebrow: 'SERVICEFLOW ADMINISTRATION',
    description: 'Oversee platform operations, company verification and service quality.',
    cardTitle: 'Platform overview.',
    steps: ['Review company verification', 'Maintain the service catalog', 'Follow up on requests and disputes'],
    note: 'Platform tools are organized in your admin workspace.',
    sectionTitle: 'Platform operations',
    highlights: [
      { icon: Building2, title: 'Companies', text: 'Review provider verification and company status.' },
      { icon: Wrench, title: 'Catalog', text: 'Keep services and categories up to date.' },
      { icon: ClipboardCheck, title: 'Requests & disputes', text: 'Monitor activity and help resolve issues.' },
    ],
  },
}

export function LandingPage() {
  const { user } = useSession()
  const content = user ? roleContent[user.role] : null
  const firstName = user?.name.trim().split(/\s+/)[0] || 'there'

  return <>
    <section className="sf-landing-hero">
      <div>
        <p className="sf-eyebrow">{content?.eyebrow ?? 'LOCAL EXPERTISE. CLEAR NEXT STEPS.'}</p>
        <h1 className="sf-display text-4xl font-bold md:text-6xl">
          {content ? `Welcome back, ${firstName}.` : <>Your home needs help.<br />We keep it simple.</>}
        </h1>
        <p className="my-6 max-w-xl text-lg text-text-secondary">
          {content?.description ?? 'Discover service companies, agree the price and follow your work from the first request to the final invoice.'}
        </p>
        <div className="flex flex-wrap gap-4">
          {user
            ? <Link className="sf-primary-link" to={destination(user)}>Go to dashboard <ArrowRight size={18} /></Link>
            : <>
                <Link className="sf-primary-link" to="/services">Explore services <ArrowRight size={18} /></Link>
                <Link className="sf-secondary-link" to="/register">Create an account</Link>
              </>}
        </div>
      </div>
      <SurfaceCard className="space-y-6 p-7">
        <Wrench size={36} aria-hidden="true" />
        <h2 className="sf-display text-2xl font-semibold">{content?.cardTitle ?? 'Every detail, together.'}</h2>
        <ol className="space-y-5">
          {(content?.steps ?? ['Choose a company and send a request', 'Review your quotation and appointment', 'Track progress and view your invoice']).map((step, index) => (
            <li key={step} className="flex gap-4"><span className="sf-mono">0{index + 1}</span>{step}</li>
          ))}
        </ol>
        <p className="border-t border-line pt-5 text-sm text-text-secondary">
          {content?.note ?? 'You approve the price and proposed time before work begins.'}
        </p>
      </SurfaceCard>
    </section>
    <section id="how-it-works" className="my-12">
      <h2 className="sf-display mb-6 text-3xl font-bold">{content?.sectionTitle ?? 'A clear path to getting it done'}</h2>
      <div className="grid gap-5 md:grid-cols-3">
        {(content?.highlights ?? [
          { icon: Building2, title: 'Find your team', text: 'Compare services, locations and public starting prices.' },
          { icon: CalendarCheck, title: 'Make the decisions', text: 'Approve the quotation and the company’s proposed appointment.' },
          { icon: ClipboardCheck, title: 'Follow every step', text: 'Keep requests, jobs, invoices and feedback in your client dashboard.' },
        ]).map(({ icon: Icon, title, text }) => <SurfaceCard key={title} className="space-y-4 p-6">
          <Icon size={26} aria-hidden="true" /><h3 className="sf-display text-xl font-semibold">{title}</h3><p className="text-text-secondary">{text}</p>
        </SurfaceCard>)}
      </div>
    </section>
  </>
}
