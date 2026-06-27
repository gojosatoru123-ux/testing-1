import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, BrainCircuit, Code2, Home } from 'lucide-react';
import { getAllArticles } from '@/lib/content';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Backend Engineering Roadmap',
    template: '%s',
  },
  description: 'Interactive backend engineering documentation, mind maps, and practice workflows.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const docs = getAllArticles('docs');
  const mindmaps = getAllArticles('mindmap');
  const practice = getAllArticles('practice');

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-950">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-3 font-bold tracking-tight text-slate-950">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white"><BrainCircuit className="h-5 w-5" /></span>
                <span className="hidden sm:inline">Backend Roadmap</span>
              </Link>
              <nav className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <TopLink href="/" icon={<Home className="h-4 w-4" />} label="Home" />
                <TopLink href={docs[0] ? `/docs/${docs[0].slug}` : '/'} icon={<BookOpen className="h-4 w-4" />} label="Docs" />
                <TopLink href={mindmaps[0] ? `/mindmap/${mindmaps[0].slug}` : '/'} icon={<BrainCircuit className="h-4 w-4" />} label="Mind maps" />
                <TopLink href={practice[0] ? `/practice/${practice[0].slug}` : '/'} icon={<Code2 className="h-4 w-4" />} label="Practice" />
              </nav>
            </div>
          </header>

          <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-8">
            <aside className="hidden lg:block">
              <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <SidebarSection title="Documentation" items={docs.map((item) => ({ href: `/docs/${item.slug}`, label: item.title, meta: item.category }))} />
                {mindmaps.length > 0 && <SidebarSection title="Mind maps" items={mindmaps.slice(0, 24).map((item) => ({ href: `/mindmap/${item.slug}`, label: item.title }))} />}
                {practice.length > 0 && <SidebarSection title="Practice" items={practice.slice(0, 24).map((item) => ({ href: `/practice/${item.slug}`, label: item.title }))} />}
              </div>
            </aside>
            <main className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

function TopLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return <Link href={href} className="inline-flex items-center gap-2 rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950">{icon}<span className="hidden sm:inline">{label}</span></Link>;
}

function SidebarSection({ title, items }: { title: string; items: Array<{ href: string; label: string; meta?: string }> }) {
  return (
    <section className="mb-6 last:mb-0">
      <h2 className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h2>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="block rounded-2xl px-3 py-2 text-sm text-slate-600 transition hover:bg-violet-50 hover:text-violet-700">
              <span className="line-clamp-2 font-medium">{item.label}</span>
              {item.meta && <span className="mt-0.5 block truncate text-xs text-slate-400">{item.meta}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
