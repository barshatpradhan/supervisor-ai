import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BrainCircuit, CheckCircle2, Menu, ShieldCheck, Users, X, Zap } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { SupervisorLogo } from '../components/ui/SupervisorLogo'
import { useAuth } from '../features/auth/hooks/useAuth'

const workflow = [
  ['01', 'Create your organization', 'Set up a secure workspace for your team.'],
  ['02', 'Upload requirements', 'Bring PDF, DOCX, or TXT project documents into one place.'],
  ['03', 'Review AI analysis', 'Turn requirements into structured skills, effort, and role signals.'],
  ['04', 'Assign with context', 'Review ranked recommendations and confirm the assignment yourself.'],
]

const features = [
  [BrainCircuit, 'AI requirement analysis', 'Convert project documents into structured summaries, skills, estimated effort, and suggested roles.'],
  [Users, 'Employee recommendations', 'Review persisted ranked matches using project requirements and workforce data.'],
  [Zap, 'Workload visibility', 'See backend-derived workload, capacity, and availability before assigning work.'],
  [CheckCircle2, 'Human-controlled assignment', 'Assign a recommendation to an existing task or create a task through the supported workflow.'],
  [ArrowRight, 'Progress tracking', 'Keep delivery visible as employees update task progress and supervisors monitor work.'],
  [ShieldCheck, 'Organization-scoped security', 'Role-based access and organization context keep product data separated.'],
]

const roles = [
  ['Organization administrator', 'Creates the workspace, manages projects, reviews analysis, and confirms assignments.'],
  ['Supervisor', 'Reviews projects and recommendations, assigns work, and monitors delivery.'],
  ['Employee', 'Views assigned tasks, updates progress, and reviews their available workload.'],
]

export function LandingPage() {
  const { isAuthenticated } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="min-h-screen bg-surface-page text-ink-900">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-white" href="#main-content">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-border-subtle/80 bg-surface-page/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link aria-label="Supervisor AI home" className="shrink-0" onClick={closeMenu} to="/"><SupervisorLogo /></Link>
          <nav aria-label="Public navigation" className="hidden items-center gap-6 md:flex">
            <a className="text-sm font-medium text-ink-600 hover:text-ink-900" href="#features">Features</a>
            <a className="text-sm font-medium text-ink-600 hover:text-ink-900" href="#workflow">How it works</a>
            <a className="text-sm font-medium text-ink-600 hover:text-ink-900" href="#roles">Roles</a>
            <a className="text-sm font-medium text-ink-600 hover:text-ink-900" href="#security">Security</a>
            {isAuthenticated ? <Link className="text-sm font-semibold text-primary-700" to="/dashboard">Go to dashboard</Link> : <Link className="text-sm font-semibold text-primary-700" to="/login">Sign in</Link>}
            {!isAuthenticated ? <Link className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700" to="/register">Create organization</Link> : null}
          </nav>
          <button aria-expanded={menuOpen} aria-label={menuOpen ? 'Close menu' : 'Open menu'} className="rounded-md p-2 focus-visible:outline-3 focus-visible:outline-primary-300 md:hidden" onClick={() => setMenuOpen((open) => !open)} type="button">{menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
        </div>
        {menuOpen ? <nav aria-label="Mobile public navigation" className="grid gap-2 border-t border-border-subtle px-5 py-4 md:hidden"><a className="rounded-md px-3 py-2 hover:bg-surface-muted" href="#features" onClick={closeMenu}>Features</a><a className="rounded-md px-3 py-2 hover:bg-surface-muted" href="#workflow" onClick={closeMenu}>How it works</a><a className="rounded-md px-3 py-2 hover:bg-surface-muted" href="#roles" onClick={closeMenu}>Roles</a><a className="rounded-md px-3 py-2 hover:bg-surface-muted" href="#security" onClick={closeMenu}>Security</a>{isAuthenticated ? <Link className="rounded-md px-3 py-2 font-semibold text-primary-700" onClick={closeMenu} to="/dashboard">Go to dashboard</Link> : <><Link className="rounded-md px-3 py-2 font-semibold text-primary-700" onClick={closeMenu} to="/login">Sign in</Link><Link className="rounded-md bg-primary-600 px-3 py-2 font-semibold text-white" onClick={closeMenu} to="/register">Create organization</Link></>}</nav> : null}
      </header>

      <main id="main-content">
        <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-20 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-28 lg:pt-28">
          <div><p className="text-sm font-bold uppercase tracking-[.18em] text-primary-700">AI-assisted workforce planning</p><h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-6xl">Turn project requirements into better team assignments</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-ink-600">Upload project documents, identify required skills, review workload-aware employee recommendations, and assign work from one secure platform.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/register"><Button> Create your organization <ArrowRight aria-hidden="true" className="ml-2 size-4" /></Button></Link><a className="inline-flex min-h-10 items-center rounded-md border border-border-subtle bg-surface-card px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-surface-muted" href="#workflow">See how it works</a></div><p className="mt-5 text-sm text-ink-500">Recommendations support human decisions; assignments are always confirmed by your team.</p></div>
          <div aria-label="Supervisor AI workflow preview" className="rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-sm sm:p-7"><div className="mb-6 flex items-center justify-between"><span className="text-sm font-semibold text-ink-600">Project staffing workspace</span><span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">Organization scoped</span></div><div className="grid gap-3">{['Project requirements', 'AI analysis', 'Ranked recommendations', 'Confirmed assignment'].map((label, index) => <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-card-alt p-4" key={label}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">{index + 1}</span><div><p className="font-semibold text-ink-900">{label}</p><p className="text-sm text-ink-500">{index === 3 ? 'Human approval stays in the loop.' : 'Structured signals for the next step.'}</p></div></div>)}</div></div>
        </section>
        <section className="border-y border-border-subtle bg-surface-card-alt"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><p className="max-w-2xl text-xl font-semibold leading-8 text-ink-900">Project requirements are detailed. Skill information is distributed. Workload changes. Supervisor AI brings those signals together so staffing decisions are easier to review.</p></div></section>
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8" id="workflow"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.18em] text-primary-700">How it works</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">A clearer path from requirements to delivery</h2></div><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{workflow.map(([number, title, copy]) => <article className="rounded-xl border border-border-subtle bg-surface-card p-5" key={number}><p className="text-sm font-bold text-primary-700">{number}</p><h3 className="mt-8 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-ink-600">{copy}</p></article>)}</div></section>
        <section className="bg-surface-card-alt" id="features"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.18em] text-primary-700">Built for the full workflow</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">Useful structure without removing human judgment</h2></div><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map(([Icon, title, copy]) => { const FeatureIcon = Icon as typeof BrainCircuit; return <article className="rounded-xl border border-border-subtle bg-surface-card p-6" key={title as string}><FeatureIcon aria-hidden="true" className="size-6 text-primary-700" /><h3 className="mt-5 text-lg font-semibold">{title as string}</h3><p className="mt-2 text-sm leading-6 text-ink-600">{copy as string}</p></article> })}</div></div></section>
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8" id="roles"><p className="text-sm font-bold uppercase tracking-[.18em] text-primary-700">Roles</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">A shared operating picture for every role</h2><div className="mt-10 grid gap-4 md:grid-cols-3">{roles.map(([title, copy]) => <article className="rounded-xl border border-border-subtle bg-surface-card p-6" key={title}><h3 className="text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-ink-600">{copy}</p></article>)}</div></section>
        <section className="border-y border-border-subtle bg-surface-card-alt" id="security"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-primary-700">Security by design</p><h2 className="mt-3 text-3xl font-bold">Trust the boundaries around your work</h2></div><ul className="grid gap-3 text-sm leading-6 text-ink-700 sm:grid-cols-2">{['Organization-scoped data access', 'Role-based authorization', 'Protected application routes', 'Authenticated document access', 'Secure invitation tokens', 'Human confirmation before assignment'].map((item) => <li className="flex gap-2" key={item}><CheckCircle2 aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary-700" />{item}</li>)}</ul></div></section>
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="rounded-2xl bg-primary-900 px-6 py-12 text-white sm:px-12"><h2 className="max-w-2xl text-3xl font-bold sm:text-4xl">Create your organization and build a clearer project workflow</h2><p className="mt-4 max-w-2xl text-primary-100">Set up your organization, bring in your team, and use project analysis and workforce data to support better assignment decisions.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/register"><Button> Create your organization </Button></Link><Link className="inline-flex min-h-10 items-center rounded-md border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10" to="/login">Sign in</Link></div></div></section>
      </main>
      <footer className="border-t border-border-subtle"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-ink-600 sm:px-8 md:flex-row md:items-center md:justify-between"><div><SupervisorLogo /><p className="mt-2">© {new Date().getFullYear()} Supervisor AI</p></div><nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2"><a href="#main-content">Home</a><a href="#features">Features</a><a href="#workflow">How it works</a><a href="#roles">Roles</a><a href="#security">Security</a><Link to="/login">Sign in</Link><Link to="/register">Create organization</Link></nav></div></footer>
    </div>
  )
}
