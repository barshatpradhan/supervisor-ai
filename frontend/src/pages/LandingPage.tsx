import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, FileText, Menu, Pause, Play, Sparkles, X } from 'lucide-react'
import { BarList } from '../components/charts/BarList'
import { DonutChart } from '../components/charts/DonutChart'
import { RadialScore } from '../components/charts/RadialScore'
import { AiNote } from '../components/ui/AiNote'
import { Chip } from '../components/ui/Chip'
import { StatusBadge } from '../components/ui/StatusBadge'
import { SupervisorLogo } from '../components/ui/SupervisorLogo'
import { RecommendationCard } from '../features/ai-recommendations/components/RecommendationCard'
import { useAuth } from '../features/auth/hooks/useAuth'
import type { BackendRecommendation } from '../types/backend'

// Everything below is illustrative sample data for the product previews.
const sampleCandidates = [
  { load: 72, name: 'Aisha Bello', reason: 'Built the v2 inventory endpoints', score: 92 },
  { load: 78, name: 'Marcus Lee', reason: 'Owns label printer integration', score: 81 },
  { load: 64, name: 'Daniel Kim', reason: 'Strong PostgreSQL, less API work', score: 67 },
]

const sampleWorkload = [
  { name: 'Lena Ortiz', value: 91 },
  { name: 'Marcus Lee', value: 78 },
  { name: 'Aisha Bello', value: 72 },
  { name: 'Daniel Kim', value: 64 },
  { name: 'Tom Reyes', value: 48 },
]

const sampleStatus = [
  { color: 'status-todo', name: 'To do', value: 8 },
  { color: 'status-in-progress', name: 'In progress', value: 12 },
  { color: 'status-review', name: 'In review', value: 5 },
  { color: 'status-blocked', name: 'Blocked', value: 3 },
  { color: 'status-completed', name: 'Completed', value: 18 },
]

const sampleRecommendation: BackendRecommendation = {
  availabilityPercentage: 28,
  confidenceScore: 86,
  employeeId: 'sample-aisha',
  employeeName: 'Aisha Bello',
  estimatedProjectHours: 56,
  fullName: 'Aisha Bello',
  matchScore: 92,
  matchedPreferredSkills: [],
  matchedRequiredSkills: ['Node.js', 'REST APIs', 'PostgreSQL'],
  matchedSkills: ['Node.js', 'REST APIs', 'PostgreSQL'],
  missingPreferredSkills: [],
  missingRequiredSkills: ['Offline sync'],
  missingSkills: ['Offline sync'],
  performanceScore: 91,
  rank: 1,
  reasons: ['Built the v2 inventory endpoints this work extends.', 'Has the most PostgreSQL experience on the team.', 'Workload leaves room for about 11 hours a week.'],
  score: 92,
  scoreBreakdown: { availability: 28, performance: 91, skillMatch: 96, workload: 72 },
  suitability: 'strong',
  summary: 'Built the v2 inventory endpoints',
  weeklyCapacityHours: 40,
  workloadPercentage: 72,
}

const workflow = [
  ['Create your organization', 'Set up a private workspace and invite supervisors and employees.'],
  ['Upload requirements', 'Add PDF, DOCX or TXT project documents to a project.'],
  ['Review the AI analysis', 'See the summary, required skills, estimated hours and suggested roles.'],
  ['Assign with context', 'Compare ranked people by skill, workload and availability, then assign.'],
] as const

const roles = [
  ['Organization admin', 'Creates the workspace, invites the team, manages projects and confirms assignments.'],
  ['Supervisor', 'Reviews analysis and recommendations, assigns work and watches delivery and workload.'],
  ['Employee', 'Sees assigned tasks, logs progress and keeps their skills and profile current.'],
] as const

const securityPoints = [
  'Data scoped to each organization',
  'Role-based access for every page and API',
  'Signed-in access to project documents',
  'Single-use, expiring invitation links',
  'AI never assigns work on its own',
  'Every assignment is a person’s decision',
]

const navLinks = [
  ['#product', 'Product'],
  ['#how-it-works', 'How it works'],
  ['#roles', 'Roles'],
  ['#security', 'Security'],
] as const

const primaryLinkClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-primary-600 px-5 text-sm font-semibold text-text-on-primary no-underline transition hover:bg-primary-700'
const secondaryLinkClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border-strong bg-surface-card px-5 text-sm font-semibold text-text-primary no-underline transition hover:bg-surface-muted'

/** A window-like frame around a product preview, captioned so nobody mistakes it for live data. */
function PreviewFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="overflow-hidden rounded-card border border-border-default bg-surface-canvas shadow-overlay">
        <div className="flex items-center justify-between gap-3 border-b border-border-default bg-surface-card px-4 py-2.5">
          <SupervisorLogo className="scale-75 origin-left" compact />
          <span className="helper truncate text-text-tertiary">{label}</span>
        </div>
        <div className="p-3 sm:p-4">{children}</div>
      </div>
      <figcaption className="helper text-text-tertiary">Sample data shown for illustration.</figcaption>
    </figure>
  )
}

function SectionHeading({ id, subtitle, title }: { id?: string; subtitle?: string; title: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <h2 className="m-0 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl" id={id}>{title}</h2>
      {subtitle ? <p className="m-0 text-lg leading-8 text-text-secondary">{subtitle}</p> : null}
    </div>
  )
}

const heroStages = ['Upload', 'Analyze', 'Rank', 'Assign'] as const
const STAGE_MS = 2600

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

/**
 * A looping walkthrough of the real flow, built from the app's own components:
 * upload a document, AI analyzes it, people are ranked, a person assigns.
 */
function HeroPreview() {
  const reducedMotion = usePrefersReducedMotion()
  const [paused, setPaused] = useState(false)
  const [tick, setTick] = useState(0)
  const isStill = reducedMotion || paused
  const stage = isStill ? heroStages.length - 1 : tick % heroStages.length

  useEffect(() => {
    if (isStill) return
    const timer = window.setInterval(() => setTick((value) => value + 1), STAGE_MS)
    return () => window.clearInterval(timer)
  }, [isStill])

  const isAnalyzed = stage >= 1
  const showOwners = stage >= 2
  const assigned = stage >= 3

  return (
    <PreviewFrame label="Warehouse scanner rollout · AI analysis">
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <ol aria-label="Walkthrough steps" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {heroStages.map((name, index) => (
              <li
                aria-current={index === stage ? 'step' : undefined}
                className={[
                  'helper rounded-pill px-2.5 py-1 font-medium transition-colors duration-300',
                  index === stage ? 'bg-primary-600 text-text-on-primary' : index < stage ? 'bg-primary-100 text-primary-700' : 'bg-surface-card text-text-tertiary',
                ].join(' ')}
                key={name}
              >
                {index + 1}. {name}
              </li>
            ))}
          </ol>
          {!reducedMotion ? (
            <button
              aria-pressed={paused}
              className="helper inline-flex min-h-8 items-center gap-1 rounded-control px-2 font-medium text-text-secondary hover:bg-surface-card hover:text-text-primary"
              onClick={() => setPaused((value) => !value)}
              type="button"
            >
              {paused ? <Play aria-hidden="true" size={14} /> : <Pause aria-hidden="true" size={14} />}
              {paused ? 'Play' : 'Pause'}
            </button>
          ) : null}
        </div>

        <section className="flex flex-col gap-3 rounded-card border border-ai-border bg-surface-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-pill bg-ai-bg text-ai-fg"><Sparkles size={16} /></span>
              <div>
                <p className="section-title m-0 text-text-primary">AI analysis</p>
                <p className="helper m-0 text-text-tertiary">From Scanner rollout requirements.pdf</p>
              </div>
            </div>
            {isAnalyzed ? <span className="stat-md text-text-primary">56h</span> : <StatusBadge label={stage === 0 ? 'Uploading' : 'Analyzing'} status="pending" />}
          </div>
          {stage === 0 ? (
            <div className="flex flex-col gap-2">
              <span className="helper text-text-secondary">Uploading 1.4 MB · PDF</span>
              <div className="h-2 overflow-hidden rounded-pill bg-chart-track">
                <div className="h-full rounded-pill bg-chart-1 motion-safe:animate-[preview-fill_2.2s_ease-out_forwards]" key={tick} style={isStill ? { width: '100%' } : undefined} />
              </div>
              <div className="h-3 w-4/5 rounded bg-surface-muted" />
              <div className="h-3 w-3/5 rounded bg-surface-muted" />
            </div>
          ) : (
            <div className="flex flex-col gap-3 motion-safe:animate-[preview-in_0.5s_ease-out]">
              <p className="body m-0 text-text-primary">Move handheld scanners to the v2 inventory API with batch sync, an offline retry queue and label printing.</p>
              <div className="flex flex-wrap gap-2">
                {['Node.js', 'REST APIs', 'PostgreSQL', 'Offline sync'].map((skill) => <Chip key={skill} tone="ai">{skill}</Chip>)}
              </div>
            </div>
          )}
        </section>

        <section className={['flex flex-col gap-2.5 rounded-card border border-border-default bg-surface-card p-4 transition-opacity duration-500', showOwners ? 'opacity-100' : 'opacity-40'].join(' ')}>
          <p className="section-title m-0 text-text-primary">Suggested owners</p>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {sampleCandidates.map((candidate, index) => {
              const isOwner = assigned && index === 0
              return (
                <li className={['flex items-center gap-3 rounded-control p-1 transition-colors duration-300', isOwner ? 'bg-primary-50' : ''].join(' ')} key={candidate.name}>
                  <RadialScore color="chart-ai" label={`${candidate.name} match`} size={44} value={showOwners ? candidate.score : 0} />
                  <div className="min-w-0 flex-1">
                    <p className="body-strong m-0 truncate text-text-primary">{candidate.name}</p>
                    <p className="helper m-0 truncate text-text-tertiary">{candidate.reason} · workload {candidate.load}%</p>
                  </div>
                  {isOwner ? (
                    <StatusBadge label="Assigned" status="completed" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={[
                        'label inline-flex min-h-8 items-center rounded-control px-3',
                        index === 0 ? 'bg-primary-600 text-text-on-primary' : 'border border-border-strong text-text-primary',
                      ].join(' ')}
                    >
                      Assign
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          <AiNote />
        </section>
      </div>
    </PreviewFrame>
  )
}

function DocumentsPreview() {
  const documents = [
    { label: 'Analyzed', name: 'Scanner rollout requirements.pdf', status: 'completed' },
    { label: 'Analyzing', name: 'Printer vendor notes.docx', status: 'pending' },
    { label: 'Failed', name: 'Warehouse floor plan.pdf', status: 'failed' },
  ]
  return (
    <PreviewFrame label="Project · Documents">
      <div className="grid gap-3">
        <ul className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border-default bg-surface-card p-0">
          {documents.map((document, index) => (
            <li className={['flex items-center gap-2.5 px-3 py-3', index > 0 ? 'border-t border-chart-grid' : '', index === 0 ? 'bg-primary-50' : ''].join(' ')} key={document.name}>
              <FileText aria-hidden="true" className="shrink-0 text-text-secondary" size={16} />
              <span className="body-strong min-w-0 flex-1 truncate text-text-primary">{document.name}</span>
              <StatusBadge label={document.label} status={document.status} />
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 rounded-card border border-ai-border bg-surface-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="section-title m-0 text-text-primary">AI analysis</p>
            <span className="stat-md text-text-primary">56h</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip tone="ai">High complexity</Chip>
            <Chip tone="ai">56h estimated</Chip>
          </div>
          <p className="label m-0 text-text-secondary">Suggested roles</p>
          <div className="flex flex-wrap gap-2">
            {['Backend engineer', 'QA engineer', 'DevOps engineer'].map((role) => <Chip key={role}>{role}</Chip>)}
          </div>
        </div>
      </div>
    </PreviewFrame>
  )
}

function WorkloadPreview() {
  return (
    <PreviewFrame label="Dashboard">
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-card border border-border-default bg-surface-card p-4">
          <p className="section-title m-0 text-text-primary">Task status</p>
          <DonutChart centerLabel="tasks" data={sampleStatus} legend="below" size={120} />
        </section>
        <section className="flex flex-col gap-3 rounded-card border border-border-default bg-surface-card p-4">
          <div>
            <p className="section-title m-0 text-text-primary">Team workload</p>
            <p className="helper m-0 text-text-tertiary">Dashed line marks the 80% limit</p>
          </div>
          <BarList data={sampleWorkload} nameWidth={88} threshold={80} />
        </section>
      </div>
    </PreviewFrame>
  )
}

function ProductRow({ children, points, reverse = false, title, text }: { children: ReactNode; points: string[]; reverse?: boolean; text: string; title: string }) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <div className={['flex flex-col gap-4', reverse ? 'lg:order-2' : ''].join(' ')}>
        <h3 className="m-0 text-2xl font-semibold tracking-tight text-text-primary">{title}</h3>
        <p className="m-0 text-base leading-7 text-text-secondary">{text}</p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {points.map((point) => (
            <li className="body flex gap-2 text-text-primary" key={point}>
              <Check aria-hidden="true" className="mt-0.5 shrink-0 text-primary-600" size={16} />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function LandingPage() {
  const { isAuthenticated } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    document.title = 'Supervisor AI · Staff projects with AI you can check'
  }, [])

  const accountLinks = isAuthenticated ? (
    <Link className={primaryLinkClass} onClick={closeMenu} to="/dashboard">Go to dashboard</Link>
  ) : (
    <>
      <Link className="label px-2 text-text-primary no-underline hover:text-text-link" onClick={closeMenu} to="/login">Sign in</Link>
      <Link className={primaryLinkClass} onClick={closeMenu} to="/register">Create organization</Link>
    </>
  )

  return (
    <div className="min-h-screen bg-surface-canvas text-text-primary">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-text-on-primary" href="#main-content">Skip to content</a>

      <header className="sticky top-0 z-40 border-b border-border-default bg-surface-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link aria-label="Supervisor AI home" className="shrink-0" onClick={closeMenu} to="/"><SupervisorLogo /></Link>
          <nav aria-label="Public navigation" className="hidden items-center gap-7 md:flex">
            {navLinks.map(([href, label]) => (
              <a className="label text-text-secondary no-underline hover:text-text-primary" href={href} key={href}>{label}</a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">{accountLinks}</div>
          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex size-11 items-center justify-center rounded-control text-text-primary hover:bg-surface-muted md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          </button>
        </div>
        {menuOpen ? (
          <nav aria-label="Mobile public navigation" className="grid gap-1 border-t border-border-default px-4 py-3 md:hidden">
            {navLinks.map(([href, label]) => (
              <a className="body rounded-control px-3 py-2.5 text-text-primary no-underline hover:bg-surface-muted" href={href} key={href} onClick={closeMenu}>{label}</a>
            ))}
            <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-chart-grid pt-3">{accountLinks}</div>
          </nav>
        ) : null}
      </header>

      <main id="main-content">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pb-24 lg:pt-20">
          <div className="flex flex-col gap-6">
            <span className="label inline-flex w-fit items-center gap-1.5 rounded-pill bg-ai-bg px-3 py-1 text-ai-fg">
              <Sparkles aria-hidden="true" size={14} />
              AI-assisted staffing for project teams
            </span>
            <h1 className="m-0 max-w-2xl text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
              Turn project requirements into better team assignments
            </h1>
            <p className="m-0 max-w-xl text-lg leading-8 text-text-secondary">
              Upload a requirements document. Supervisor AI pulls out the skills and effort, ranks the people who fit
              by workload and availability, and leaves the final call to you.
            </p>
            <div className="flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Link className={primaryLinkClass} to="/dashboard">Go to dashboard <ArrowRight aria-hidden="true" size={16} /></Link>
              ) : (
                <Link className={primaryLinkClass} to="/register">Create organization <ArrowRight aria-hidden="true" size={16} /></Link>
              )}
              <a className={secondaryLinkClass} href="#product">See the product</a>
            </div>
            <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0">
              {['Reads PDF, DOCX and TXT', 'Workload-aware ranking', 'A person assigns every task'].map((point) => (
                <li className="helper flex items-center gap-1.5 text-text-secondary" key={point}>
                  <Check aria-hidden="true" className="text-success-fg" size={14} />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <HeroPreview />
        </section>

        <section aria-labelledby="product-title" className="border-y border-border-default bg-surface-card" id="product">
          <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-20 sm:px-8">
            <SectionHeading
              id="product-title"
              subtitle="Each screen puts the picture first and the numbers beside it, so a staffing decision takes minutes."
              title="See how the analysis works"
            />
            <ProductRow
              points={['Summary, required and preferred skills', 'Estimated hours and complexity', 'Suggested roles and delivery risks']}
              text="Upload a project document and get a structured read of what the work needs. Failed or pending files say so plainly."
              title="AI requirement analysis"
            >
              <DocumentsPreview />
            </ProductRow>
            <ProductRow
              points={['Matched and missing skills at a glance', 'Live availability, workload and performance', 'The reasons behind every ranking']}
              reverse
              text="Each person gets a match score with the evidence behind it. Assigning stays a person's click."
              title="Recommendations you can check"
            >
              <PreviewFrame label="AI recommendations">
                <RecommendationCard rec={sampleRecommendation} />
              </PreviewFrame>
            </ProductRow>
            <ProductRow
              points={['Task status across every project', 'Workload against an 80% limit', 'Progress logged by the people doing the work']}
              text="Track delivery and spot overload before it happens, with workload calculated from real assignments."
              title="Workload you can see"
            >
              <WorkloadPreview />
            </ProductRow>
          </div>
        </section>

        <section aria-labelledby="how-title" className="mx-auto max-w-7xl px-4 py-20 sm:px-8" id="how-it-works">
          <SectionHeading id="how-title" title="From requirements to delivery in four steps" />
          <ol className="m-0 mt-10 grid list-none gap-4 p-0 md:grid-cols-2 lg:grid-cols-4">
            {workflow.map(([title, copy], index) => (
              <li className="flex flex-col gap-3 rounded-card border border-border-default bg-surface-card p-5 shadow-card" key={title}>
                <span className="num-sm inline-flex size-8 items-center justify-center rounded-pill bg-primary-100 text-primary-700">{index + 1}</span>
                <h3 className="section-title m-0 text-text-primary">{title}</h3>
                <p className="body m-0 text-text-secondary">{copy}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="roles-title" className="border-y border-border-default bg-surface-card" id="roles">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
            <SectionHeading id="roles-title" title="One shared picture for every role" />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {roles.map(([title, copy]) => (
                <article className="flex flex-col gap-2 rounded-card border border-border-default bg-surface-canvas p-5" key={title}>
                  <h3 className="section-title m-0 text-text-primary">{title}</h3>
                  <p className="body m-0 text-text-secondary">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="security-title" className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start" id="security">
          <SectionHeading id="security-title" subtitle="Your project data stays inside your organization." title="Security by design" />
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            {securityPoints.map((point) => (
              <li className="body flex items-start gap-2.5 rounded-control border border-border-default bg-surface-card p-4 text-text-primary" key={point}>
                <Check aria-hidden="true" className="mt-0.5 shrink-0 text-primary-600" size={16} />
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-8">
          <div className="flex flex-col gap-6 rounded-card bg-primary-900 px-6 py-12 sm:px-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-2xl flex-col gap-3">
              <h2 className="m-0 text-3xl font-semibold tracking-tight text-text-on-primary">Staff your next project with evidence</h2>
              <p className="m-0 text-lg leading-8 text-primary-200">Create your organization, invite your team and upload the first requirements document.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Link className="inline-flex min-h-11 items-center rounded-control bg-surface-card px-5 text-sm font-semibold text-primary-800 no-underline hover:bg-primary-50" to="/dashboard">Go to dashboard</Link>
              ) : (
                <>
                  <Link className="inline-flex min-h-11 items-center rounded-control bg-surface-card px-5 text-sm font-semibold text-primary-800 no-underline hover:bg-primary-50" to="/register">Create organization</Link>
                  <Link className="inline-flex min-h-11 items-center rounded-control border border-primary-400 px-5 text-sm font-semibold text-text-on-primary no-underline hover:bg-primary-800" to="/login">Sign in</Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-default bg-surface-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <SupervisorLogo />
            <p className="helper m-0 text-text-tertiary">© {new Date().getFullYear()} Supervisor AI</p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2">
            {navLinks.map(([href, label]) => (
              <a className="label text-text-secondary no-underline hover:text-text-primary" href={href} key={href}>{label}</a>
            ))}
            {!isAuthenticated ? (
              <>
                <Link className="label text-text-secondary no-underline hover:text-text-primary" to="/login">Sign in</Link>
                <Link className="label text-text-secondary no-underline hover:text-text-primary" to="/register">Create organization</Link>
              </>
            ) : null}
          </nav>
        </div>
      </footer>
    </div>
  )
}
