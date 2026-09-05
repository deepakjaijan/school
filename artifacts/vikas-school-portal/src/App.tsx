import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  Archive, ArrowUpRight, Bell, BookOpen, CalendarDays, Check,
  ChevronRight, CircleAlert, ClipboardList, Clock3, Download, FileText, GraduationCap,
  LayoutDashboard, LibraryBig, Mail, MapPin, Menu, MoreHorizontal, PanelLeftClose,
  PanelLeftOpen, Phone, Plus, RefreshCw, Search, Send, Sparkles, Star, Trash2,
  Users, Video, X, type LucideIcon,
} from 'lucide-react';
import {
  getListAttendanceQueryKey, getListClassesQueryKey, getListStudentsQueryKey,
  useCreateEvent, useCreateNotice, useCreateStudent,
  useDeleteStudent, useGetDashboard, useListEvents, useListLectures, useListNotices,
  useGetProfile, useListAttendance, useListClasses, useListResources, useListStudents,
  useListTeachers, useRecordAttendance, useUpdateClassTeacher,
} from '@workspace/api-client-react';
import type {
  ClassSection, EventInput, NoticeInput, Resource, SchoolEvent, Student,
  StudentInput, Teacher,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const classOptions = ['Nursery', 'LKG', 'UKG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const navItems: { href: string; label: string; icon: LucideIcon; key: string }[] = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, key: 'overview' },
  { href: '/students', label: 'Students', icon: Users, key: 'students' },
  { href: '/classes', label: 'Classes', icon: LibraryBig, key: 'classes' },
  { href: '/attendance', label: 'Attendance', icon: ClipboardList, key: 'attendance' },
  { href: '/teachers', label: 'Teachers', icon: GraduationCap, key: 'teachers' },
  { href: '/academics', label: 'Academics', icon: LibraryBig, key: 'academics' },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays, key: 'calendar' },
  { href: '/notices', label: 'Notice board', icon: Bell, key: 'notices' },
];

function classNames(...values: (string | false | undefined)[]) { return values.filter(Boolean).join(' '); }
function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatTime(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function Button({ children, variant = 'primary', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'soft' | 'ghost' | 'danger' }) {
  return <button className={classNames(
    'focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
    variant === 'primary' && 'bg-primary text-primary-foreground shadow-[0_5px_0_hsl(var(--primary)/.15)] hover:-translate-y-0.5 hover:shadow-[0_7px_0_hsl(var(--primary)/.15)]',
    variant === 'soft' && 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
    variant === 'ghost' && 'text-muted-foreground hover:bg-secondary hover:text-foreground',
    variant === 'danger' && 'bg-destructive/10 text-destructive hover:bg-destructive/15',
    className,
  )} {...props}>{children}</button>;
}

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'orange' | 'teal' | 'red' | 'green' }) {
  const tones = {
    neutral: 'bg-secondary text-muted-foreground',
    orange: 'bg-accent/15 text-[hsl(27_65%_39%)]',
    teal: 'bg-primary/10 text-primary',
    red: 'bg-destructive/10 text-destructive',
    green: 'bg-[hsl(145_42%_90%)] text-[hsl(145_42%_30%)]',
  };
  return <span className={classNames('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em]', tones[tone])}>{children}</span>;
}

function Modal({ title, eyebrow, onClose, children, wide = false }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-[hsl(204_36%_18%/.45)] p-0 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true">
    <div className={classNames('animate-rise max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.6rem] border border-card-border bg-card p-6 shadow-2xl sm:rounded-[1.6rem]', wide ? 'max-w-2xl' : 'max-w-lg')}>
      <div className="mb-6 flex items-start justify-between gap-5">
        <div>{eyebrow && <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-primary">{eyebrow}</p>}<h2 className="font-serif text-2xl text-foreground">{title}</h2></div>
        <button data-testid="button-close-dialog" onClick={onClose} className="focus-ring rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close dialog"><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>;
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block space-y-1.5"><span className="text-xs font-semibold text-muted-foreground">{label}</span>{children}{hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}</label>;
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={classNames('focus-ring h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/70', props.className)} />; }
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={classNames('focus-ring min-h-28 w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/70', props.className)} />; }
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={classNames('focus-ring h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground', props.className)} />; }

function LoadingRows({ count = 4, cols = 3 }: { count?: number; cols?: number }) {
  return <div className="space-y-3">{Array.from({ length: count }, (_, i) => <div key={i} className="grid grid-cols-3 gap-4 rounded-xl border border-card-border p-4">{Array.from({ length: cols }, (_, j) => <div key={j} className="skeleton h-4 rounded" />)}</div>)}</div>;
}
function QueryState({ error, onRetry }: { error?: boolean; onRetry: () => void }) {
  if (!error) return null;
  return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center"><CircleAlert className="mx-auto mb-3 text-destructive" size={25} /><h3 className="font-serif text-lg">Could not load this view</h3><p className="mt-1 text-sm text-muted-foreground">The school office data is taking a moment. Try again.</p><Button data-testid="button-retry" onClick={onRetry} variant="soft" className="mt-4"><RefreshCw size={15} /> Try again</Button></div>;
}
function EmptyState({ icon: Icon, title, detail, action }: { icon: LucideIcon; title: string; detail: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-card-border bg-card/50 px-6 py-14 text-center"><div className="mb-4 rounded-2xl bg-primary/10 p-4 text-primary"><Icon size={25} /></div><h3 className="font-serif text-xl">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{detail}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const pathname = location.split('?')[0];
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const profile = useGetProfile();
  const { signOut } = useClerk();
  const active = navItems.find((item) => item.href === pathname)?.key ?? 'overview';
  const pageName = navItems.find((item) => item.key === active)?.label ?? 'Overview';
  return <div className="grain min-h-[100dvh] bg-background">
    <aside className={classNames('fixed inset-y-0 left-0 z-30 flex w-[252px] flex-col bg-[hsl(var(--sidebar))] px-4 py-5 text-[hsl(var(--sidebar-foreground))] transition-transform duration-300', collapsed && 'lg:w-[82px]', mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
      <div className="flex items-center gap-3 px-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] shadow-sm"><span className="font-serif text-xl">V</span></div>
        <div className={classNames('min-w-0 transition-opacity', collapsed && 'lg:pointer-events-none lg:w-0 lg:opacity-0')}><p className="truncate font-serif text-[17px]">Vikas Shiksha</p><p className="truncate font-mono text-[9px] uppercase tracking-[.13em] text-[hsl(var(--sidebar-foreground)/.6)]">Sadan · Office hub</p></div>
      </div>
      <div className="my-8 border-t border-[hsl(var(--sidebar-border)/.6)]" />
      <nav className="space-y-1" aria-label="Main navigation">{navItems.map(({ href, label, icon: Icon, key }) => <Link key={key} href={href} data-testid={`link-nav-${key}`} onClick={() => setMobileOpen(false)} className={classNames('group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors', active === key ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))] shadow-inner' : 'text-[hsl(var(--sidebar-foreground)/.68)] hover:bg-[hsl(var(--sidebar-accent)/.7)] hover:text-[hsl(var(--sidebar-foreground))]')}><Icon size={18} className="shrink-0" /><span className={classNames('transition-opacity', collapsed && 'lg:pointer-events-none lg:w-0 lg:opacity-0')}>{label}</span>{active === key && !collapsed && <ChevronRight size={14} className="ml-auto text-[hsl(var(--sidebar-primary))]" />}</Link>)}</nav>
      <div className={classNames('mt-auto rounded-2xl border border-[hsl(var(--sidebar-border)/.7)] bg-[hsl(var(--sidebar-accent)/.55)] p-4', collapsed && 'lg:hidden')}><div className="mb-3 flex items-center gap-2"><Sparkles size={15} className="text-[hsl(var(--sidebar-primary))]" /><span className="text-xs font-semibold">A good day starts here</span></div><p className="text-[11px] leading-5 text-[hsl(var(--sidebar-foreground)/.63)]">Keep the school office clear, current and connected.</p></div>
      <button data-testid="button-collapse-sidebar" onClick={() => setCollapsed(!collapsed)} className="focus-ring mt-5 hidden items-center gap-3 rounded-xl px-3 py-2 text-xs text-[hsl(var(--sidebar-foreground)/.6)] hover:bg-[hsl(var(--sidebar-accent))] lg:flex">{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}<span className={classNames(collapsed && 'lg:hidden')}>Collapse sidebar</span></button>
    </aside>
    {mobileOpen && <button aria-label="Close navigation" data-testid="button-close-mobile-nav" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-20 bg-[hsl(204_36%_18%/.4)] lg:hidden" />}
    <main className={classNames('min-h-[100dvh] transition-[padding] duration-300 lg:pl-[252px]', collapsed && 'lg:pl-[82px]')}>
      <header className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-3"><button data-testid="button-open-mobile-nav" onClick={() => setMobileOpen(true)} className="focus-ring rounded-lg p-2 text-muted-foreground hover:bg-secondary lg:hidden"><Menu size={20} /></button><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">Vikas Shiksha Sadan</p><h1 className="font-serif text-xl sm:text-2xl">{pageName}</h1></div></div>
         <div className="relative flex items-center gap-2 sm:gap-4"><div className="hidden items-center gap-2 rounded-xl bg-secondary/70 px-3 py-2 text-xs text-muted-foreground sm:flex"><MapPin size={14} className="text-primary" /> Rohtak campus</div><button data-testid="button-notifications" onClick={() => setNotificationOpen(!notificationOpen)} className="focus-ring relative rounded-xl p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Open notifications"><Bell size={18} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" /></button>{notificationOpen && <div className="animate-rise absolute right-12 top-12 w-64 rounded-2xl border border-card-border bg-card p-4 shadow-xl"><div className="flex items-center gap-2 text-sm font-semibold"><Check size={15} className="text-primary" /> You are all caught up</div><p className="mt-2 text-xs leading-5 text-muted-foreground">New office updates will appear here as they arrive.</p></div>}<button data-testid="button-profile-menu" onClick={() => signOut({ redirectUrl: basePath || '/' })} title={`Sign out ${profile.data?.name ?? 'account'}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(35_52%_75%)] text-xs font-bold text-[hsl(204_36%_20%)]">{profile.data?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'ME'}</button></div>
      </header>
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10">{children}</div>
    </main>
  </div>;
}

function PageIntro({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div className="animate-rise"><p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[.2em] text-primary">{eyebrow}</p><h2 className="font-serif text-3xl leading-tight sm:text-[2.65rem]">{title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{detail}</p></div>{action && <div className="animate-rise delay-1">{action}</div>}</div>;
}

function Dashboard() {
  const dashboard = useGetDashboard();
  const data = dashboard.data;
  if (dashboard.isLoading) return <><PageIntro eyebrow="Monday · 17 June 2024" title="Good morning, office team." detail="A clear view of today’s school rhythm, from attendance to what needs your attention." /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="skeleton h-32 rounded-2xl" /><div className="skeleton h-32 rounded-2xl" /><div className="skeleton h-32 rounded-2xl" /><div className="skeleton h-32 rounded-2xl" /></div><div className="skeleton mt-6 h-72 rounded-2xl" /></>;
  if (dashboard.isError || !data) return <QueryState error onRetry={() => dashboard.refetch()} />;
   const metrics = [{ label: 'Enrolled students', value: data.studentCount, note: 'Across Nursery–XII', icon: Users, tint: 'bg-primary/10 text-primary' }, { label: 'Teaching staff', value: data.teacherCount, note: 'Faculty & coordinators', icon: GraduationCap, tint: 'bg-accent/15 text-[hsl(27_65%_39%)]' }, { label: 'Today’s attendance', value: `${data.attendance}%`, note: 'A little above last week', icon: Check, tint: 'bg-[hsl(145_42%_90%)] text-[hsl(145_42%_30%)]' }, { label: 'Upcoming exams', value: data.upcomingExams, note: 'Next 30 days', icon: ClipboardList, tint: 'bg-[hsl(210_44%_92%)] text-[hsl(210_44%_38%)]' }];
  return <div><PageIntro eyebrow="Monday · 17 June 2024" title="Good morning, office team." detail="A clear view of today’s school rhythm, from attendance to what needs your attention." action={<Link href="/students" data-testid="link-dashboard-students" className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_5px_0_hsl(var(--primary)/.15)] transition hover:-translate-y-0.5">Open student records <ArrowUpRight size={16} /></Link>} />
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(({ label, value, note, icon: Icon, tint }, i) => <div key={label} className={classNames('animate-rise rounded-2xl border border-card-border bg-card p-5 shadow-[0_2px_0_hsl(var(--border)/.35)]', `delay-${i + 1}`)} data-testid={`card-metric-${i}`}><div className="mb-5 flex items-start justify-between"><span className={classNames('rounded-xl p-2.5', tint)}><Icon size={18} /></span><MoreHorizontal size={17} className="text-muted-foreground/60" /></div><p className="font-mono text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>)}</section>
    <section className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
      <div className="rounded-2xl border border-card-border bg-card p-5 sm:p-6"><div className="mb-6 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">Keep a pulse</p><h3 className="mt-1 font-serif text-2xl">Recent activity</h3></div><Link href="/notices" data-testid="link-dashboard-notices" className="text-xs font-bold text-primary hover:underline">See notice board</Link></div><div className="space-y-1">{data.recentActivity?.length ? data.recentActivity.map((item) => <div key={item.id} className="group flex gap-3 border-b border-border/70 py-4 last:border-0" data-testid={`activity-${item.id}`}><div className={classNames('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', item.tone === 'warning' ? 'bg-accent' : item.tone === 'success' ? 'bg-[hsl(145_42%_48%)]' : 'bg-primary')} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p></div><span className="whitespace-nowrap pt-0.5 font-mono text-[10px] text-muted-foreground">{item.time}</span></div>) : <EmptyState icon={Archive} title="A quiet morning" detail="Recent office activity will appear here as your team gets moving." />}</div></div>
      <div className="overflow-hidden rounded-2xl bg-[hsl(var(--primary))] text-primary-foreground"><div className="p-6"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-primary-foreground/60">Quick actions</p><h3 className="mt-2 font-serif text-2xl">Move the day forward.</h3></div><Sparkles size={22} className="text-[hsl(var(--sidebar-primary))]" /></div><div className="mt-8 space-y-2">{[{ href: '/students', label: 'Add a student', icon: Plus }, { href: '/notices', label: 'Publish a notice', icon: Send }, { href: '/calendar', label: 'Plan an event', icon: CalendarDays }].map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-quick-${label.toLowerCase().replaceAll(' ', '-')}`} className="flex items-center justify-between rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 px-3 py-3 text-sm font-semibold transition hover:bg-primary-foreground/10"><span className="flex items-center gap-3"><Icon size={17} className="text-[hsl(var(--sidebar-primary))]" />{label}</span><ChevronRight size={15} className="text-primary-foreground/55" /></Link>)}</div></div><div className="border-t border-primary-foreground/10 bg-primary-foreground/5 px-6 py-4 text-xs text-primary-foreground/65">The small details are what make a school run well.</div></div>
    </section>
  </div>;
}

function StudentModal({ onClose }: { onClose: () => void }) {
  const create = useCreateStudent();
  const qc = useQueryClient();
  const [form, setForm] = useState<StudentInput>({ name: '', admissionNumber: '', className: 'X', section: 'A', rollNumber: 1, parentContact: '', studentContact: '', address: '', email: '' });
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => { e.preventDefault(); if (!form.name.trim() || !form.admissionNumber.trim() || !form.parentContact.trim() || !form.studentContact.trim() || !form.address.trim() || !form.email.trim()) { setError('Complete the student details and contact information before saving.'); return; } setError(''); create.mutate({ data: form }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListStudentsQueryKey() }); onClose(); } }); };
  return <Modal eyebrow="Principal access · Student records" title="Add a student" onClose={onClose} wide><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Student name"><Input data-testid="input-student-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mehak Sharma" /></Field><Field label="Admission number"><Input data-testid="input-admission-number" value={form.admissionNumber} onChange={(e) => setForm({ ...form, admissionNumber: e.target.value })} placeholder="VSS / 24 / 018" /></Field><Field label="Class"><Select data-testid="select-student-class" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })}>{classOptions.map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Section"><Select data-testid="select-student-section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>{['A', 'B', 'C', 'D'].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Roll number"><Input data-testid="input-roll-number" type="number" min="1" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: Number(e.target.value) })} /></Field><Field label="Student contact"><Input data-testid="input-student-contact" value={form.studentContact} onChange={(e) => setForm({ ...form, studentContact: e.target.value })} placeholder="+91 98 7654 3210" /></Field><Field label="Parent contact"><Input data-testid="input-parent-contact" value={form.parentContact} onChange={(e) => setForm({ ...form, parentContact: e.target.value })} placeholder="+91 98 7654 3210" /></Field><Field label="Student email"><Input data-testid="input-student-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="student@vikasshiksha.edu.in" /></Field><div className="sm:col-span-2"><Field label="Home address"><Input data-testid="input-student-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Locality, city" /></Field></div></div><p className="rounded-xl bg-accent/10 px-3 py-2 text-xs leading-5 text-[hsl(27_65%_32%)]">Private contact details are protected from other student accounts and visible to principal accounts only.</p>{error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}{create.isError && <p className="text-xs text-destructive">Could not save this student. Please try again.</p>}<div className="flex justify-end gap-2 border-t border-border pt-5"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button data-testid="button-save-student" type="submit" disabled={create.isPending}>{create.isPending ? 'Saving record…' : <><Check size={16} /> Save student</>}</Button></div></form></Modal>;
}

function Students() {
  const [search, setSearch] = useState(''); const [className, setClassName] = useState(''); const [section, setSection] = useState(''); const [addOpen, setAddOpen] = useState(false); const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const params = useMemo(() => ({ search: search || undefined, className: className || undefined }), [search, className]);
  const profile = useGetProfile(); const students = useListStudents(params); const remove = useDeleteStudent(); const qc = useQueryClient();
  const isPrincipal = profile.data?.role === 'principal';
  const data = (students.data ?? []).filter((student) => !section || student.section === section);
  const classCounts = classOptions.map((item) => ({ item, count: data.filter((student) => student.className === item).length })).filter((item) => isPrincipal ? true : item.count > 0);
  return <div><PageIntro eyebrow={isPrincipal ? "Principal access · People · Student records" : "Student profile · Private view"} title={isPrincipal ? "Know every learner." : "Your school profile."} detail={isPrincipal ? "Manage Nursery to XII in one dependable register. Private contact details stay visible only to the principal." : "Your learning information is available to you. Other students’ phone numbers and addresses are never shared."} action={isPrincipal ? <Button data-testid="button-add-student" onClick={() => setAddOpen(true)}><Plus size={17} /> Add student</Button> : undefined} />
     <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><div className="relative"><Search size={17} className="absolute left-3 top-3.5 text-muted-foreground" /><Input data-testid="input-search-students" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isPrincipal ? "Search name or admission number" : "Search your profile"} className="pl-10" /></div><Select data-testid="select-filter-class" value={className} onChange={(e) => setClassName(e.target.value)} className="sm:w-44"><option value="">All classes</option>{classOptions.map((x) => <option key={x} value={x}>Class {x}</option>)}</Select><Select data-testid="select-filter-section" value={section} onChange={(e) => setSection(e.target.value)} className="sm:w-36"><option value="">All sections</option>{['A', 'B', 'C', 'D'].map((x) => <option key={x} value={x}>Section {x}</option>)}</Select></div>
    {isPrincipal && <div className="mb-6 rounded-2xl border border-accent/30 bg-accent/10 p-4"><div className="flex items-start gap-3"><Users size={18} className="mt-0.5 text-[hsl(27_65%_39%)]" /><div><p className="text-sm font-semibold text-[hsl(27_65%_28%)]">Class totals</p><div className="mt-3 flex flex-wrap gap-2">{classCounts.map(({ item, count }) => <span key={item} className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">Class {item} <span className="ml-1 font-mono text-primary">{count}</span></span>)}</div></div></div></div>}
    {!isPrincipal && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm"><CircleAlert size={18} className="mt-0.5 shrink-0 text-primary" /><p className="leading-6 text-muted-foreground"><strong className="text-foreground">Privacy protected.</strong> You can see your own contact details, but other student phone numbers, emails and addresses are hidden.</p></div>}
     {students.isLoading ? <LoadingRows cols={4} /> : students.isError ? <QueryState error onRetry={() => students.refetch()} /> : data.length === 0 ? <EmptyState icon={Users} title="No students found" detail={search || className || section ? 'Try a different name, admission number, class or section.' : 'Student records will appear here after the principal adds them.'} /> : <div className="overflow-hidden rounded-2xl border border-card-border bg-card"><div className="hidden grid-cols-[minmax(220px,1.6fr)_1fr_1fr_1fr_44px] gap-4 border-b border-border bg-secondary/45 px-5 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground md:grid"><span>Student</span><span>Class</span><span>Attendance</span><span>Average</span><span /></div><div>{data.map((student) => <div key={student.id} data-testid={`row-student-${student.id}`} className="group grid gap-3 border-b border-border/70 px-5 py-4 last:border-0 md:grid-cols-[minmax(220px,1.6fr)_1fr_1fr_1fr_44px] md:items-center md:gap-4"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(35_52%_75%)] text-sm font-bold text-[hsl(204_36%_20%)]">{student.avatar || student.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{student.name}</p><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{student.admissionNumber} · Roll {student.rollNumber}</p></div></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="md:hidden font-semibold text-foreground">Class</span><Badge tone="teal">{student.className} · {student.section}</Badge></div><div className="text-xs"><span className="mr-2 md:hidden font-semibold">Attendance</span><span className={student.attendance < 75 ? 'text-destructive' : 'text-foreground'}>{student.attendance}%</span><span className="ml-2 text-muted-foreground">present</span></div><div className="text-xs"><span className="mr-2 md:hidden font-semibold">Average</span><span className="font-semibold">{student.averageScore}%</span><span className="ml-2 text-muted-foreground">{student.achievementCount} achievements</span></div>{isPrincipal && <button data-testid={`button-delete-student-${student.id}`} onClick={() => setDeleteTarget(student)} className="focus-ring justify-self-end rounded-lg p-2 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 md:opacity-0"><Trash2 size={16} /></button>}<div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground md:col-span-5">{student.studentContact ? <span className="flex items-center gap-1"><Phone size={12} /> {student.studentContact}</span> : <span>Student contact hidden</span>}{student.parentContact ? <span className="flex items-center gap-1"><Phone size={12} /> Parent {student.parentContact}</span> : <span>Parent contact hidden</span>}{isPrincipal && student.address && <span className="flex items-center gap-1"><MapPin size={12} /> {student.address}</span>}{isPrincipal && student.email && <span className="flex items-center gap-1"><Mail size={12} /> {student.email}</span>}</div></div>)}</div></div>}
    {addOpen && <StudentModal onClose={() => setAddOpen(false)} />}{deleteTarget && <Modal eyebrow="Principal access · Student records" title="Remove this student?" onClose={() => setDeleteTarget(null)}><p className="text-sm leading-6 text-muted-foreground">You are about to remove <strong className="text-foreground">{deleteTarget.name}</strong> from the student register. This action cannot be undone.</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleteTarget(null)}>Keep record</Button><Button data-testid="button-confirm-delete-student" variant="danger" disabled={remove.isPending} onClick={() => remove.mutate({ id: deleteTarget.id }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListStudentsQueryKey() }); setDeleteTarget(null); } })}><Trash2 size={15} /> {remove.isPending ? 'Removing…' : 'Remove student'}</Button></div></Modal>}
  </div>;
}

function ClassAssignmentModal({ section, teachers, teachersLoading, teachersError, onClose }: { section: ClassSection; teachers: Teacher[]; teachersLoading: boolean; teachersError: boolean; onClose: () => void }) {
  const update = useUpdateClassTeacher();
  const qc = useQueryClient();
  const [teacherId, setTeacherId] = useState(section.homeroomTeacherId ? String(section.homeroomTeacherId) : '');
  const save = () => {
    update.mutate({
      className: section.className,
      section: section.section,
      data: { teacherId: teacherId ? Number(teacherId) : null },
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListClassesQueryKey() });
        onClose();
      },
    });
  };
  return <Modal eyebrow={`Principal access · Class ${section.className} · Section ${section.section}`} title="Set homeroom teacher" onClose={onClose}>
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
        <p className="text-sm font-semibold">Section {section.section}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{section.studentCount} learners · {section.attendanceRate}% attendance this term</p>
      </div>
      <Field label="Homeroom teacher" hint="Clearing this field leaves the section available for assignment.">
        <Select data-testid={`select-homeroom-teacher-${section.className}-${section.section}`} value={teacherId} onChange={(e) => setTeacherId(e.target.value)} disabled={teachersLoading || teachersError}>
          <option value="">No teacher assigned</option>
          {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.subject}</option>)}
        </Select>
      </Field>
      {teachersLoading && <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">Loading the faculty directory…</p>}
      {teachersError && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">The faculty directory could not be loaded. Close this window and try again.</p>}
      {update.isError && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">The assignment could not be saved. Try again.</p>}
      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button data-testid={`button-save-homeroom-${section.className}-${section.section}`} onClick={save} disabled={update.isPending || teachersLoading || teachersError || teachers.length === 0 && Boolean(teacherId)}><Check size={16} /> {update.isPending ? 'Saving…' : 'Save assignment'}</Button>
      </div>
    </div>
  </Modal>;
}

function SectionCard({ section, isPrincipal, onAssign }: { section: ClassSection; isPrincipal: boolean; onAssign: (section: ClassSection) => void }) {
  const rateTone = section.attendanceRate < 75 ? 'red' : section.attendanceRate < 85 ? 'orange' : 'green';
  return <article data-testid={`card-class-section-${section.className}-${section.section}`} className="rounded-2xl border border-card-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_25px_hsl(var(--primary)/.06)]">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 font-serif text-xl text-primary">{section.section}</div>
        <div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Section</p><h4 className="font-serif text-xl">Class {section.className}</h4></div>
      </div>
      <Badge tone={rateTone}>{section.attendanceRate}% present</Badge>
    </div>
    <div className="mt-6 grid grid-cols-2 gap-3 border-y border-border/70 py-4">
      <div><p className="font-mono text-2xl font-semibold">{section.studentCount}</p><p className="mt-1 text-[11px] text-muted-foreground">Learners</p></div>
      <div><p className="truncate text-sm font-semibold">{section.homeroomTeacherName || 'Not assigned'}</p><p className="mt-1 text-[11px] text-muted-foreground">Homeroom teacher</p></div>
    </div>
    <div className="mt-4 flex items-center justify-between gap-3">
      <Link href={`/attendance?class=${encodeURIComponent(section.className)}&section=${encodeURIComponent(section.section)}`} data-testid={`link-take-attendance-${section.className}-${section.section}`} className="text-xs font-bold text-primary hover:underline">Take attendance <ArrowUpRight size={13} className="ml-1 inline" /></Link>
      {isPrincipal && <Button data-testid={`button-assign-teacher-${section.className}-${section.section}`} variant="soft" className="min-h-9 px-3 text-xs" onClick={() => onAssign(section)}>{section.homeroomTeacherId ? 'Change teacher' : 'Assign teacher'}</Button>}
    </div>
  </article>;
}

function Classes() {
  const profile = useGetProfile();
  const classes = useListClasses();
  const teachers = useListTeachers();
  const [assignmentTarget, setAssignmentTarget] = useState<ClassSection | null>(null);
  const isPrincipal = profile.data?.role === 'principal';
  const allSummaries = classes.data ?? [];
  // The classes endpoint applies the teacher's assignment permission server-side.
  // Keeping the response intact also works with Clerk profiles whose id is not the
  // numeric teacher id stored on a section.
  const visibleSections = useMemo(() => allSummaries.flatMap((summary) => summary.sections), [allSummaries]);
  const visibleByClass = useMemo(() => classOptions.map((className) => {
    const summary = allSummaries.find((item) => item.className === className);
    const sections = visibleSections.filter((item) => item.className === className);
    return { className, totalStudents: isPrincipal ? (summary?.totalStudents ?? sections.reduce((total, item) => total + item.studentCount, 0)) : sections.reduce((total, item) => total + item.studentCount, 0), sections };
  }), [allSummaries, isPrincipal, visibleSections]);
  return <div>
    <PageIntro eyebrow={isPrincipal ? "Principal access · School structure" : "Teaching workspace · Your sections"} title="Know each classroom by heart." detail={isPrincipal ? "Keep every section, learner count and homeroom responsibility in one dependable place." : "Your assigned sections are ready for a quick attendance check and a clear view of the learners in your care."} />
    {profile.isLoading || classes.isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><div className="skeleton h-64 rounded-2xl" /><div className="skeleton h-64 rounded-2xl" /><div className="skeleton h-64 rounded-2xl" /></div>
      : profile.isError || classes.isError ? <QueryState error onRetry={() => { profile.refetch(); classes.refetch(); }} />
      : profile.data?.role !== 'principal' && profile.data?.role !== 'teacher' ? <EmptyState icon={LibraryBig} title="Classes are an office workspace" detail="Class structure and homeroom assignments are available to principals and class teachers." />
      : !isPrincipal && visibleSections.length === 0 ? <EmptyState icon={GraduationCap} title="No sections assigned yet" detail="A principal needs to assign a homeroom section before you can manage its attendance." />
      : <div className="space-y-7">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 p-4">
          <LibraryBig size={18} className="text-[hsl(27_65%_39%)]" />
          <p className="text-sm font-semibold">{isPrincipal ? 'Nursery through XII' : `${visibleSections.length} assigned ${visibleSections.length === 1 ? 'section' : 'sections'}`}</p>
          <span className="ml-auto font-mono text-xs text-muted-foreground">{visibleByClass.reduce((sum, item) => sum + item.totalStudents, 0)} learners in view</span>
        </div>
        <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
          {visibleByClass.filter((item) => isPrincipal || item.sections.length > 0).map((item) => <section key={item.className} className="space-y-3">
            <div className="flex items-end justify-between px-1"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">Class group</p><h3 data-testid={`text-class-heading-${item.className}`} className="font-serif text-2xl">{item.className}</h3></div><span className="text-xs text-muted-foreground">{item.totalStudents} learners</span></div>
            <div className="space-y-3">{item.sections.length ? item.sections.map((section) => <SectionCard key={`${section.className}-${section.section}`} section={section} isPrincipal={isPrincipal} onAssign={setAssignmentTarget} />) : <div className="rounded-2xl border border-dashed border-card-border bg-card/50 p-5 text-sm text-muted-foreground">No sections have been created for this class yet.</div>}</div>
          </section>)}
        </div>
      </div>}
    {assignmentTarget && <ClassAssignmentModal section={assignmentTarget} teachers={teachers.data ?? []} teachersLoading={teachers.isLoading} teachersError={teachers.isError} onClose={() => setAssignmentTarget(null)} />}
  </div>;
}

type AttendanceRow = { studentId: number; studentName: string; rollNumber: number; status: string; remarks: string };

function Attendance() {
  const profile = useGetProfile();
  const classes = useListClasses();
  const isPrincipal = profile.data?.role === 'principal';
  const allSummaries = classes.data ?? [];
  // The API returns only the assigned sections for a teacher and all sections
  // for a principal, so do not compare a Clerk id with a numeric teacher id here.
  const assignedSections = useMemo(() => allSummaries.flatMap((summary) => summary.sections), [allSummaries]);
  const firstSection = assignedSections[0];
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [savedAt, setSavedAt] = useState('');
  const [permissionMessage, setPermissionMessage] = useState('');
  const location = useLocation()[0];
  const attendanceParams = useMemo(() => ({ className: selectedClass || classOptions[0], section: selectedSection || 'A', date: selectedDate }), [selectedClass, selectedSection, selectedDate]);
  const attendance = useListAttendance(attendanceParams, { query: { enabled: Boolean(selectedClass && selectedSection && selectedDate), queryKey: getListAttendanceQueryKey(attendanceParams) } });
  const record = useRecordAttendance();
  const qc = useQueryClient();
  const availableClasses = useMemo(() => Array.from(new Set(assignedSections.map((section) => section.className))), [assignedSections]);
  const availableSections = useMemo(() => assignedSections.filter((section) => section.className === selectedClass), [assignedSections, selectedClass]);
  const studentParams = useMemo(() => selectedClass ? { className: selectedClass } : undefined, [selectedClass]);
  const rosterStudents = useListStudents(studentParams);
  const attendanceRows = useMemo(() => {
    const sourceStudents = (rosterStudents.data ?? []).filter((student) => student.section === selectedSection);
    const sourceAttendance = attendance.data ?? [];
    const byStudent = new Map(sourceAttendance.map((item) => [item.studentId, item]));
    if (!sourceAttendance.length && sourceStudents.length) {
      return sourceStudents.map((student) => {
        const existing = byStudent.get(student.id);
        return { studentId: student.id, studentName: student.name, rollNumber: student.rollNumber, status: existing?.status && existing.status !== 'unmarked' ? existing.status : 'present', remarks: existing?.remarks || '' };
      });
    }
    return sourceAttendance.map((item) => ({ studentId: item.studentId, studentName: item.studentName, rollNumber: item.rollNumber, status: item.status && item.status !== 'unmarked' ? item.status : 'present', remarks: item.remarks || '' }));
  }, [rosterStudents.data, attendance.data, selectedSection]);

  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const queryClass = params.get('class');
    const querySection = params.get('section');
    if (queryClass && availableClasses.includes(queryClass)) setSelectedClass(queryClass);
    else if (!selectedClass && firstSection) setSelectedClass(firstSection.className);
    if (querySection && assignedSections.some((section) => section.className === (queryClass || firstSection?.className) && section.section === querySection)) setSelectedSection(querySection);
    else if (!selectedSection && firstSection) setSelectedSection(firstSection.section);
  }, [location, availableClasses, firstSection, assignedSections, selectedClass, selectedSection]);

  useEffect(() => {
    if (!selectedClass) return;
    if (!availableSections.some((section) => section.section === selectedSection)) setSelectedSection(availableSections[0]?.section || '');
  }, [selectedClass, selectedSection, availableSections]);

  useEffect(() => {
    setRows(attendanceRows);
    setSavedAt('');
  }, [attendanceRows]);

  const updateStatus = (studentId: number, status: string) => { setSavedAt(''); setRows((current) => current.map((row) => row.studentId === studentId ? { ...row, status } : row)); };
  const updateRemark = (studentId: number, remarks: string) => { setSavedAt(''); setRows((current) => current.map((row) => row.studentId === studentId ? { ...row, remarks } : row)); };
  const saveAttendance = () => {
    if (!selectedClass || !selectedSection || rows.length === 0) {
      setPermissionMessage('Choose an assigned class and section with learners before saving.');
      return;
    }
    setPermissionMessage('');
    record.mutate({ data: { className: selectedClass, section: selectedSection, date: selectedDate, records: rows.map(({ studentId, status, remarks }) => ({ studentId, status, ...(remarks ? { remarks } : {}) })) } }, {
      onSuccess: () => {
        setSavedAt(new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }));
        qc.invalidateQueries({ queryKey: getListAttendanceQueryKey(attendanceParams) });
        qc.invalidateQueries({ queryKey: getListClassesQueryKey() });
      },
    });
  };
  const counts = rows.reduce((result, row) => { result[row.status] = (result[row.status] || 0) + 1; return result; }, {} as Record<string, number>);
  if (profile.isLoading || classes.isLoading) return <><PageIntro eyebrow="Daily register · Attendance" title="Take attendance without losing the rhythm." detail="Choose a section, load its roster and record the day with confidence." /><div className="skeleton h-48 rounded-2xl" /><div className="skeleton mt-5 h-72 rounded-2xl" /></>;
  if (profile.isError || classes.isError) return <QueryState error onRetry={() => { profile.refetch(); classes.refetch(); }} />;
  if (profile.data?.role !== 'principal' && profile.data?.role !== 'teacher') return <><PageIntro eyebrow="Daily register · Attendance" title="Attendance is kept by the class team." detail="The attendance register is available to principals and class teachers." /><EmptyState icon={ClipboardList} title="Attendance access is limited" detail="Ask your class teacher or principal if you need an attendance update." /></>;
  if (!isPrincipal && assignedSections.length === 0) return <><PageIntro eyebrow="Daily register · Attendance" title="Take attendance without losing the rhythm." detail="Attendance opens here when a principal assigns you a homeroom section." /><EmptyState icon={ClipboardList} title="No class assigned" detail="You do not have permission to open an attendance register yet. Ask the principal to assign a section to your profile." /></>;
  return <div>
    <PageIntro eyebrow={isPrincipal ? "Principal access · Daily register" : "Teaching workspace · Daily register"} title="Take attendance without losing the rhythm." detail="Load the right roster, make a quick pass through the room and save a clear record for the office." />
    <section className="rounded-2xl border border-card-border bg-card p-5 shadow-[0_2px_0_hsl(var(--border)/.35)] sm:p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Class"><Select data-testid="select-attendance-class" value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection(''); }}><option value="">Choose class</option>{availableClasses.map((className) => <option key={className} value={className}>Class {className}</option>)}</Select></Field>
        <Field label="Section"><Select data-testid="select-attendance-section" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} disabled={!selectedClass}><option value="">Choose section</option>{availableSections.map((section) => <option key={section.section} value={section.section}>Section {section.section}</option>)}</Select></Field>
        <Field label="Register date"><Input data-testid="input-attendance-date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} /></Field>
      </div>
      {selectedClass && selectedSection && <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Class {selectedClass} · Section {selectedSection}</span><span className="h-1 w-1 rounded-full bg-border" />{selectedDate === new Date().toISOString().slice(0, 10) ? 'Today' : formatDate(selectedDate)}<span className="ml-auto">{rows.length} learners loaded</span></div>}
    </section>
    {attendance.isError || rosterStudents.isError ? <div className="mt-5"><QueryState error onRetry={() => { attendance.refetch(); rosterStudents.refetch(); }} /></div>
      : !selectedClass || !selectedSection ? <div className="mt-5"><EmptyState icon={ClipboardList} title="Choose a register to begin" detail="Select the class, section and date above. The learner roster will appear here." /></div>
      : attendance.isLoading || rosterStudents.isLoading ? <div className="mt-5"><LoadingRows cols={3} /></div>
      : rows.length === 0 ? <div className="mt-5"><EmptyState icon={Users} title="No learners in this section" detail="Add students in Student records, then return here to take attendance." action={<Link href="/students" data-testid="link-attendance-empty-students" className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Open student records</Link>} /></div>
      : <section className="mt-5 overflow-hidden rounded-2xl border border-card-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border bg-secondary/45 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">Roll call</p><h3 className="mt-1 font-serif text-2xl">Class {selectedClass} · {selectedSection}</h3></div><div className="flex flex-wrap gap-2">{[['present', 'Present', 'green'], ['absent', 'Absent', 'red'], ['late', 'Late', 'orange'], ['excused', 'Excused', 'teal']].map(([status, label, tone]) => <Badge key={status} tone={tone as 'green' | 'red' | 'orange' | 'teal'}>{counts[status] || 0} {label}</Badge>)}</div></div>
        <div className="divide-y divide-border/70">{rows.map((row) => <div data-testid={`row-attendance-${row.studentId}`} key={row.studentId} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(180px,1fr)_auto_minmax(180px,.7fr)] lg:items-center"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-mono text-xs font-semibold text-primary">{row.rollNumber}</div><div><p data-testid={`text-attendance-student-${row.studentId}`} className="text-sm font-semibold">{row.studentName}</p><p className="mt-0.5 text-[11px] text-muted-foreground">Roll {row.rollNumber}</p></div></div><div className="grid grid-cols-4 gap-1 rounded-xl bg-secondary/55 p-1"><button data-testid={`button-attendance-present-${row.studentId}`} onClick={() => updateStatus(row.studentId, 'present')} className={classNames('rounded-lg px-2 py-2 text-[11px] font-semibold transition', row.status === 'present' ? 'bg-[hsl(145_42%_90%)] text-[hsl(145_42%_30%)] shadow-sm' : 'text-muted-foreground hover:bg-card')}>Present</button><button data-testid={`button-attendance-absent-${row.studentId}`} onClick={() => updateStatus(row.studentId, 'absent')} className={classNames('rounded-lg px-2 py-2 text-[11px] font-semibold transition', row.status === 'absent' ? 'bg-destructive/10 text-destructive shadow-sm' : 'text-muted-foreground hover:bg-card')}>Absent</button><button data-testid={`button-attendance-late-${row.studentId}`} onClick={() => updateStatus(row.studentId, 'late')} className={classNames('rounded-lg px-2 py-2 text-[11px] font-semibold transition', row.status === 'late' ? 'bg-accent/20 text-[hsl(27_65%_39%)] shadow-sm' : 'text-muted-foreground hover:bg-card')}>Late</button><button data-testid={`button-attendance-excused-${row.studentId}`} onClick={() => updateStatus(row.studentId, 'excused')} className={classNames('rounded-lg px-2 py-2 text-[11px] font-semibold transition', row.status === 'excused' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-card')}>Excused</button></div><Input data-testid={`input-attendance-remarks-${row.studentId}`} value={row.remarks} onChange={(e) => updateRemark(row.studentId, e.target.value)} placeholder="Optional remark" className="h-10" /></div>)}</div>
        <div className="flex flex-col gap-3 border-t border-border bg-secondary/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div>{permissionMessage && <p className="text-xs font-semibold text-destructive">{permissionMessage}</p>}{record.isError && <p className="text-xs font-semibold text-destructive">Attendance could not be saved. Check your connection and try again.</p>}{savedAt && <p data-testid="status-attendance-saved" className="flex items-center gap-2 text-xs font-semibold text-[hsl(145_42%_30%)]"><Check size={14} /> Saved at {savedAt}</p>}</div><Button data-testid="button-save-attendance" onClick={saveAttendance} disabled={record.isPending}><Check size={16} /> {record.isPending ? 'Saving register…' : 'Save attendance'}</Button></div>
      </section>}
  </div>;
}

function Teachers() {
  const teachers = useListTeachers(); const [subject, setSubject] = useState('All'); const data = teachers.data ?? [];
  const subjects = ['All', ...Array.from(new Set(data.map((t) => t.subject)))]; const shown = subject === 'All' ? data : data.filter((t) => t.subject === subject);
  return <div><PageIntro eyebrow="People · Faculty directory" title="The people behind the lesson." detail="A quick reference for subject ownership, specializations and the humans your office supports." /><div className="mb-6 flex gap-2 overflow-x-auto pb-1">{subjects.map((item) => <button data-testid={`button-filter-teacher-${item}`} key={item} onClick={() => setSubject(item)} className={classNames('whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition', item === subject ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/70')}>{item}</button>)}</div>{teachers.isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><div className="skeleton h-56 rounded-2xl" /><div className="skeleton h-56 rounded-2xl" /><div className="skeleton h-56 rounded-2xl" /></div> : teachers.isError ? <QueryState error onRetry={() => teachers.refetch()} /> : shown.length === 0 ? <EmptyState icon={GraduationCap} title="No faculty listed" detail="Teachers will appear here once the directory is populated." /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shown.map((teacher) => <TeacherCard teacher={teacher} key={teacher.id} />)}</div>}</div>;
}
function TeacherCard({ teacher }: { teacher: Teacher }) {
  return <article data-testid={`card-teacher-${teacher.id}`} className="group relative overflow-hidden rounded-2xl border border-card-border bg-card p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_hsl(var(--primary)/.08)]"><div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-primary/5 transition group-hover:bg-primary/10" /><div className="relative flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold" style={{ backgroundColor: `${teacher.color || '#d7e6df'}55`, color: teacher.color || 'hsl(var(--primary))' }}>{teacher.initials || teacher.name.split(' ').map((n) => n[0]).join('')}</div><Badge tone="teal">{teacher.subject}</Badge></div><h3 className="mt-5 font-serif text-xl">{teacher.name}</h3><p className="mt-1 text-xs font-semibold text-primary">{teacher.specialization}</p><div className="mt-5 space-y-2 border-t border-border/70 pt-4 text-xs text-muted-foreground"><p className="flex items-center gap-2"><Clock3 size={14} /> {teacher.experience} experience</p><p className="flex items-center gap-2 truncate"><Mail size={14} /> {teacher.email}</p><p className="flex items-center gap-2"><Phone size={14} /> {teacher.phone}</p></div></article>;
}

function Academics() {
  const [className, setClassName] = useState('All'); const [subject, setSubject] = useState('All'); const [year, setYear] = useState('All');
  const resources = useListResources(useMemo(() => ({ className: className !== 'All' ? className : undefined }), [className])); const lectures = useListLectures();
  const data = (resources.data ?? []).filter((r) => (subject === 'All' || r.subject === subject) && (year === 'All' || String(r.year) === year));
  const subjects = ['All', ...Array.from(new Set((resources.data ?? []).map((r) => r.subject)))]; const years = ['All', ...Array.from(new Set((resources.data ?? []).map((r) => String(r.year))))];
  return <div><PageIntro eyebrow="Learning · Academic library" title="Make preparation easier." detail="Past papers, revision material and live learning links — all in the rhythm of the school year." /><div className="mb-6 grid gap-3 sm:grid-cols-3"><Select data-testid="select-resource-class" value={className} onChange={(e) => setClassName(e.target.value)}><option>All classes</option>{classOptions.map((x) => <option key={x} value={x}>Class {x}</option>)}</Select><Select data-testid="select-resource-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>{subjects.map((x) => <option key={x} value={x}>{x === 'All' ? 'All subjects' : x}</option>)}</Select><Select data-testid="select-resource-year" value={year} onChange={(e) => setYear(e.target.value)}>{years.map((x) => <option key={x} value={x}>{x === 'All' ? 'All years' : x}</option>)}</Select></div><div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]"><section className="rounded-2xl border border-card-border bg-card p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">Question papers & resources</p><h3 className="mt-1 font-serif text-2xl">The study shelf</h3></div><Badge tone="orange">{data.length} items</Badge></div>{resources.isLoading ? <LoadingRows cols={2} /> : resources.isError ? <QueryState error onRetry={() => resources.refetch()} /> : data.length === 0 ? <EmptyState icon={BookOpen} title="The shelf is empty" detail="Try loosening the filters or check back when materials are uploaded." /> : <div className="space-y-2">{data.map((resource) => <ResourceRow resource={resource} key={resource.id} />)}</div>}</section><section className="rounded-2xl bg-[hsl(var(--primary))] p-5 text-primary-foreground sm:p-6"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-primary-foreground/60">Learning live</p><h3 className="mt-1 font-serif text-2xl">Online lectures</h3></div><Video size={20} className="text-[hsl(var(--sidebar-primary))]" /></div><div className="mt-5 space-y-3">{lectures.isLoading ? <div className="space-y-3"><div className="skeleton h-20 rounded-xl bg-primary-foreground/10" /><div className="skeleton h-20 rounded-xl bg-primary-foreground/10" /></div> : lectures.isError ? <p className="text-sm text-primary-foreground/70">Lectures are temporarily unavailable.</p> : (lectures.data ?? []).length === 0 ? <p className="rounded-xl border border-primary-foreground/10 p-4 text-sm text-primary-foreground/70">No online lectures scheduled yet.</p> : (lectures.data ?? []).map((lecture) => <a href={lecture.meetingUrl || '#'} target="_blank" rel="noreferrer" data-testid={`link-lecture-${lecture.id}`} key={lecture.id} className="block rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 transition hover:bg-primary-foreground/10"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{lecture.title}</p><Badge tone={lecture.status === 'live' ? 'orange' : 'neutral'}>{lecture.status}</Badge></div><p className="mt-2 text-xs text-primary-foreground/60">{lecture.subject} · {lecture.className} · {lecture.teacher}</p><p className="mt-3 flex items-center gap-2 font-mono text-[10px] text-primary-foreground/70"><Clock3 size={12} /> {formatDate(lecture.scheduledAt)} · {lecture.duration}</p></a>)}</div></section></div></div>;
}
function ResourceRow({ resource }: { resource: Resource }) {
  return <div data-testid={`row-resource-${resource.id}`} className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition hover:border-primary/30 hover:bg-secondary/40"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-[hsl(27_65%_39%)]"><FileText size={17} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{resource.title}</p><p className="mt-1 text-[11px] text-muted-foreground">{resource.subject} · Class {resource.className} · {resource.year} · {resource.pages} pages</p></div><div className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex"><Download size={13} /> {resource.downloads}</div><button data-testid={`button-download-resource-${resource.id}`} disabled title="Resource file attachment is not connected yet" className="focus-ring rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-primary" aria-label={`Download ${resource.title}`}><Download size={16} /></button></div>;
}

function EventModal({ onClose }: { onClose: () => void }) {
  const create = useCreateEvent(); const qc = useQueryClient(); const [form, setForm] = useState<EventInput>({ title: '', date: '', type: 'School event', description: '', color: '#2d746d' });
  const submit = (e: FormEvent) => { e.preventDefault(); if (!form.title || !form.date) return; create.mutate({ data: form }, { onSuccess: () => { qc.invalidateQueries(); onClose(); } }); };
  return <Modal eyebrow="School calendar" title="Add an event" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="Event title"><Input data-testid="input-event-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Annual sports day" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Date"><Input data-testid="input-event-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field><Field label="Type"><Select data-testid="select-event-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>School event</option><option>Holiday</option><option>Occasion</option><option>Sports</option></Select></Field></div><Field label="Description"><Textarea data-testid="input-event-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="A short note for the office calendar" /></Field><div className="flex justify-end gap-2 border-t border-border pt-5"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button data-testid="button-save-event" type="submit" disabled={create.isPending}><Check size={16} /> {create.isPending ? 'Saving…' : 'Save event'}</Button></div></form></Modal>;
}
function CalendarPage() {
  const events = useListEvents(); const [open, setOpen] = useState(false); const [filter, setFilter] = useState('All'); const data = (events.data ?? []).filter((e) => filter === 'All' || e.type === filter).sort((a, b) => a.date.localeCompare(b.date)); const types = ['All', ...Array.from(new Set((events.data ?? []).map((e) => e.type)))];
  return <div><PageIntro eyebrow="Plan · School calendar" title="Give every date a purpose." detail="Holidays, occasions, school moments and sports — a shared rhythm for the whole campus." action={<Button data-testid="button-add-event" onClick={() => setOpen(true)}><Plus size={17} /> Add event</Button>} /><div className="mb-6 flex gap-2 overflow-x-auto pb-1">{types.map((type) => <button data-testid={`button-filter-event-${type}`} key={type} onClick={() => setFilter(type)} className={classNames('whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold', filter === type ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>{type}</button>)}</div>{events.isLoading ? <LoadingRows cols={3} /> : events.isError ? <QueryState error onRetry={() => events.refetch()} /> : data.length === 0 ? <EmptyState icon={CalendarDays} title="No dates on the calendar" detail="Add the moments that help teachers, families and students plan ahead." action={<Button data-testid="button-empty-add-event" onClick={() => setOpen(true)}><Plus size={16} /> Add first event</Button>} /> : <div className="grid gap-3">{data.map((event) => <EventRow event={event} key={event.id} />)}</div>}{open && <EventModal onClose={() => setOpen(false)} />}</div>;
}
function EventRow({ event }: { event: SchoolEvent }) {
  const date = new Date(event.date); const day = Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit' }); const month = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { month: 'short' });
  return <article data-testid={`row-event-${event.id}`} className="flex items-center gap-4 rounded-2xl border border-card-border bg-card p-4 transition hover:border-primary/30 sm:p-5"><div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl text-primary-foreground" style={{ backgroundColor: event.color || 'hsl(var(--primary))' }}><span className="font-mono text-lg font-semibold leading-none">{day}</span><span className="mt-1 text-[10px] uppercase tracking-wider">{month}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{event.title}</h3><Badge tone={event.type === 'Holiday' ? 'orange' : 'teal'}>{event.type}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{event.description || 'No description added.'}</p></div><ChevronRight className="hidden text-muted-foreground sm:block" size={18} /></article>;
}

function NoticeModal({ onClose }: { onClose: () => void }) {
  const create = useCreateNotice(); const qc = useQueryClient(); const [form, setForm] = useState<NoticeInput>({ title: '', body: '', category: 'General', pinned: false });
  const submit = (e: FormEvent) => { e.preventDefault(); if (!form.title || !form.body) return; create.mutate({ data: form }, { onSuccess: () => { qc.invalidateQueries(); onClose(); } }); };
  return <Modal eyebrow="Notice board" title="Publish a notice" onClose={onClose} wide><form onSubmit={submit} className="space-y-4"><Field label="Headline"><Input data-testid="input-notice-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Make the important part clear" /></Field><Field label="Message"><Textarea data-testid="input-notice-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write the details teachers, students or families need to know." /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Category"><Select data-testid="select-notice-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>General</option><option>Academic</option><option>Examination</option><option>Transport</option><option>Holiday</option></Select></Field><label className="mt-7 flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-input px-3 text-sm"><input data-testid="checkbox-notice-pinned" type="checkbox" checked={Boolean(form.pinned)} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Keep this notice pinned</label></div><div className="flex justify-end gap-2 border-t border-border pt-5"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button data-testid="button-publish-notice" type="submit" disabled={create.isPending}><Send size={15} /> {create.isPending ? 'Publishing…' : 'Publish notice'}</Button></div></form></Modal>;
}
function Notices() {
  const notices = useListNotices(); const [open, setOpen] = useState(false); const data = notices.data ?? [];
  return <div><PageIntro eyebrow="Communicate · Notice board" title="Say what matters." detail="A calm, visible place for the updates that keep the school community moving together." action={<Button data-testid="button-publish-notice-open" onClick={() => setOpen(true)}><Plus size={17} /> Publish notice</Button>} />{notices.isLoading ? <LoadingRows cols={2} /> : notices.isError ? <QueryState error onRetry={() => notices.refetch()} /> : data.length === 0 ? <EmptyState icon={Bell} title="The board is clear" detail="Publish an update when teachers, students or families need to hear from the school." action={<Button data-testid="button-empty-publish-notice" onClick={() => setOpen(true)}><Plus size={16} /> Publish first notice</Button>} /> : <div className="grid gap-4 lg:grid-cols-2">{data.map((notice) => <article data-testid={`card-notice-${notice.id}`} key={notice.id} className={classNames('rounded-2xl border bg-card p-5 transition hover:shadow-[0_10px_25px_hsl(var(--primary)/.06)]', notice.pinned ? 'border-accent/50' : 'border-card-border')}><div className="flex items-start justify-between gap-4"><div className="flex flex-wrap items-center gap-2"><Badge tone={notice.pinned ? 'orange' : 'teal'}>{notice.category}</Badge>{notice.pinned && <span className="flex items-center gap-1 text-[11px] font-semibold text-[hsl(27_65%_39%)]"><Star size={12} fill="currentColor" /> Pinned</span>}</div><span className="font-mono text-[10px] text-muted-foreground">{formatDate(notice.publishedAt)}</span></div><h3 className="mt-4 font-serif text-xl leading-tight">{notice.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{notice.body}</p><div className="mt-5 flex items-center gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary">{notice.author?.split(' ').map((x) => x[0]).join('').slice(0, 2)}</div> {notice.author || 'School office'}<span className="ml-auto">Published {formatTime(notice.publishedAt)}</span></div></article>)}</div>}{open && <NoticeModal onClose={() => setOpen(false)} />}</div>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Shell><Switch><Route path="/" component={Dashboard} /><Route path="/students" component={Students} /><Route path="/classes" component={Classes} /><Route path="/attendance" component={Attendance} /><Route path="/teachers" component={Teachers} /><Route path="/academics" component={Academics} /><Route path="/calendar" component={CalendarPage} /><Route path="/notices" component={Notices} /><Route component={NotFound} /></Switch></Shell></ErrorBoundary>;
}

function Landing() {
  return <div className="grain flex min-h-[100dvh] items-center justify-center bg-background px-5 py-10"><div className="grid w-full max-w-5xl gap-8 overflow-hidden rounded-[2rem] border border-card-border bg-card shadow-2xl lg:grid-cols-[1.1fr_.9fr]"><div className="bg-primary p-8 text-primary-foreground sm:p-12"><div className="flex items-center gap-3"><img src={`${basePath}/logo.svg`} alt="" className="h-11 w-11 rounded-xl" /><div><p className="font-serif text-lg">Vikas Shiksha</p><p className="font-mono text-[9px] uppercase tracking-[.16em] text-primary-foreground/60">Sadan · Senior Secondary School</p></div></div><div className="mt-24 max-w-md"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--sidebar-primary))]">School operations, made clear</p><h1 className="mt-3 font-serif text-4xl leading-tight sm:text-6xl">A dependable home for every learner.</h1><p className="mt-5 text-sm leading-7 text-primary-foreground/70">Access student profiles, academics, school events and important notices in one protected school office.</p></div></div><div className="flex flex-col justify-center p-8 sm:p-12"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">Welcome</p><h2 className="mt-3 font-serif text-3xl">Sign in to continue.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Create your student profile or sign in with your school account. Principal accounts have full access to private student contact details.</p><div className="mt-8 space-y-3"><Link href="/sign-in" data-testid="link-sign-in" className="flex h-12 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5">Sign in to the portal</Link><Link href="/sign-up" data-testid="link-sign-up" className="flex h-12 items-center justify-center rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/70">Create a student profile</Link></div><p className="mt-6 text-center text-xs leading-5 text-muted-foreground">Other students’ phone numbers, emails and addresses are private by default.</p></div></div></div>;
}

function SignInPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  useEffect(() => {
    const unsubscribe = addListener(() => queryClient.clear());
    return unsubscribe;
  }, [addListener, queryClient]);
  return null;
}

function AppRoutes() {
  return <Switch><Route path="/sign-in/*?" component={SignInPage} /><Route path="/sign-up/*?" component={SignUpPage} /><Route path="/" component={AuthenticatedHome} /><Route component={AuthenticatedHome} /></Switch>;
}

function AuthenticatedHome() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="flex min-h-[100dvh] items-center justify-center bg-background"><div className="skeleton h-24 w-72 rounded-2xl" /></div>;
  if (!isSignedIn) return <Landing />;
  return <Router />;
}

function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
  const appearance = {
    theme: shadcn,
    cssLayerName: 'clerk',
    options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
    variables: { colorPrimary: '#2D746D', colorForeground: '#20333B', colorMutedForeground: '#687982', colorDanger: '#B9493E', colorBackground: '#FFFCF5', colorInput: '#FFFDF9', colorInputForeground: '#20333B', colorNeutral: '#DCD4C6', fontFamily: 'DM Sans, sans-serif', borderRadius: '0.8rem' },
    elements: {
      rootBox: 'w-full flex justify-center',
      cardBox: 'bg-[#FFFCF5] rounded-2xl w-[440px] max-w-full overflow-hidden',
      card: '!shadow-none !border-0 !bg-transparent !rounded-none',
      footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
      headerTitle: 'font-serif text-[#20333B]',
      headerSubtitle: 'text-[#687982]',
      socialButtonsBlockButtonText: 'text-[#20333B]',
      formFieldLabel: 'text-[#20333B]',
      footerActionLink: 'text-[#2D746D]',
      footerActionText: 'text-[#687982]',
      dividerText: 'text-[#687982]',
      formButtonPrimary: 'bg-[#2D746D] hover:bg-[#245F59]',
      formFieldInput: 'border-[#DCD4C6] bg-[#FFFDF9] text-[#20333B]',
      logoBox: 'mb-4',
      logoImage: 'rounded-xl',
      socialButtonsBlockButton: 'border-[#DCD4C6] bg-[#FFFDF9]',
      dividerLine: 'bg-[#DCD4C6]',
      alert: 'border-[#DCD4C6] bg-[#F7F0E2]',
      alertText: 'text-[#20333B]',
      main: 'bg-transparent',
    },
  };
  return <WouterRouter base={basePath}><ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={appearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to Vikas Shiksha Sadan' } }, signUp: { start: { title: 'Create your student profile', subtitle: 'Join the school portal' } } }} routerPush={(to) => window.history.pushState({}, '', stripBase(to))} routerReplace={(to) => window.history.replaceState({}, '', stripBase(to))}><QueryClientProvider client={queryClient}><TooltipProvider><ClerkQueryClientCacheInvalidator /><AppRoutes /><Toaster /></TooltipProvider></QueryClientProvider></ClerkProvider></WouterRouter>;
}
export default App;