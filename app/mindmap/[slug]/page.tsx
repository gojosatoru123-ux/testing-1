import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { MindMap } from '@/components/Mindmap';
import { articleToMindmap, getAllSlugs, getArticle } from '@/lib/content';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllSlugs('mindmap').map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle('mindmap', slug);
  if (!article) return {};

  return {
    title: `${article.title} Mind Map | Backend Docs`,
    description: article.description || `Interactive mind map for ${article.title}.`,
    alternates: { canonical: `/mindmap/${slug}` },
    openGraph: {
      title: `${article.title} Mind Map`,
      description: article.description || `Interactive mind map for ${article.title}.`,
      type: 'article',
      images: article.image ? [{ url: article.image }] : [],
    },
  };
}

export default async function MindmapPage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle('mindmap', slug);
  if (!article) notFound();

  const data = articleToMindmap(article);
  const articleSlug = typeof article.data.articleSlug === 'string' ? article.data.articleSlug : article.slug;

  return (
    <section className="flex h-[calc(100vh-8rem)] min-h-[640px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <Link href={`/docs/${articleSlug}`} className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to article
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">{article.title}</h1>
          <p className="text-sm text-slate-500">Drag, zoom, and collapse branches to explore the concept structure.</p>
        </div>
        <Link href={`/docs/${articleSlug}`} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
          <BookOpen className="h-4 w-4" />
          Read guide
        </Link>
      </header>
      <div className="min-h-0 flex-1">
        <MindMap data={data} />
      </div>
    </section>
  );
}
