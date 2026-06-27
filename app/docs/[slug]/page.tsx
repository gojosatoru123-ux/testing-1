import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Network, Tag, Target } from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { getAllArticles, getAllSlugs, getArticle } from '@/lib/content';
import { generateToc, markdownToHtml } from '@/lib/markdown';
import { cn } from '@/lib/utils';

interface Props {
  params: Promise<{ slug: string }>;
}

const CATEGORY_BADGE: Record<string, string> = {
  'Low Level Design': 'bg-violet-100 text-violet-700',
  'High Level Design': 'bg-teal-100 text-teal-700',
  'Backend Design': 'bg-sky-100 text-sky-700',
  SEO: 'bg-violet-100 text-violet-700',
  'Web Security': 'bg-amber-100 text-amber-700',
  Design: 'bg-rose-100 text-rose-700',
  General: 'bg-slate-100 text-slate-700',
};

export function generateStaticParams() {
  return getAllSlugs('docs').map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle('docs', slug);
  if (!article) return {};

  return {
    title: `${article.title} | Backend Docs`,
    description: article.description,
    alternates: { canonical: `/docs/${slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      images: article.image ? [{ url: article.image }] : [],
    },
  };
}

export default async function DocsPage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle('docs', slug);
  if (!article) notFound();

  const compiledHtml = await markdownToHtml(article.content);
  const toc = generateToc(article.content);
  const articles = getAllArticles('docs');
  const currentIndex = articles.findIndex((item) => item.slug === article.slug);
  const prev = currentIndex > 0 ? articles[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null;
  const badgeClass = CATEGORY_BADGE[article.category] ?? CATEGORY_BADGE.General;

  return (
    <div className="flex gap-8 xl:gap-12">
      <article className="min-w-0 flex-1">
        <header className="mb-8 border-b border-slate-100 pb-8">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', badgeClass)}>
            <Tag className="h-3 w-3" />
            {article.category}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">{article.title}</h1>
          {article.description && <p className="mt-3 text-lg leading-relaxed text-slate-500">{article.description}</p>}
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
            {article.updated && <time dateTime={article.updated}>Updated {article.updated}</time>}
            <span>{article.readingTime}</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {article.hasMindmap && <ActionLink href={`/mindmap/${article.slug}`} icon={<Network className="h-4 w-4" />} title="Mind Map" subtitle="Visualize the concept structure" />}
            {article.hasPractice && <ActionLink href={`/practice/${article.slug}`} icon={<Target className="h-4 w-4" />} title="Practice" subtitle="Test your understanding" />}
          </div>
        </header>

        <MarkdownRenderer html={compiledHtml} />

        <nav className="mt-10 grid grid-cols-1 gap-4 border-t border-slate-100 pt-8 sm:grid-cols-2">
          {prev ? <Pager href={`/docs/${prev.slug}`} label="Previous" title={prev.title} icon={<ArrowLeft className="h-3.5 w-3.5" />} /> : <div />}
          {next ? <Pager href={`/docs/${next.slug}`} label="Next" title={next.title} icon={<ArrowRight className="h-3.5 w-3.5" />} alignRight /> : <div />}
        </nav>
      </article>
      <aside className="hidden w-56 shrink-0 xl:block">
        <div className="sticky top-24 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">On this page</h2>
          {toc.map((item) => (
            <a key={item.id} href={`#${item.id}`} className="block text-sm text-slate-500 hover:text-violet-700" style={{ paddingLeft: `${Math.max(0, item.level - 2) * 12}px` }}>
              {item.text}
            </a>
          ))}
        </div>
      </aside>
    </div>
  );
}

function ActionLink({ href, icon, title, subtitle }: { href: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return <Link href={href} className="inline-flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 text-sky-800 transition hover:border-sky-300 hover:shadow-md">{icon}<span><span className="block text-sm font-bold">{title}</span><span className="block text-xs text-sky-600">{subtitle}</span></span></Link>;
}

function Pager({ href, label, title, icon, alignRight = false }: { href: string; label: string; title: string; icon: React.ReactNode; alignRight?: boolean }) {
  return <Link href={href} className={cn('rounded-xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50', alignRight && 'text-right')}><span className={cn('mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-400', alignRight && 'justify-end')}>{!alignRight && icon}{label}{alignRight && icon}</span><span className="block truncate text-sm font-semibold text-slate-900">{title}</span></Link>;
}
