import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getAllSlugs, getArticle } from '@/lib/content';
import { markdownToHtml, generateToc } from '@/lib/markdown';

interface Props {
  params: Promise<{ slug: string }>;
}

// 1. Tell Next.js exactly what paths to build during compilation
export async function generateStaticParams() {
  const slugs = getAllSlugs('practice');
  return slugs.map((slug) => ({ slug }));
}

// 2. Build-time SEO Metadata generation
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle('practice', slug);

  if (!article) return {};

  return {
    title: `${article.title} | Documentation`,
    description: article.description,
    alternates: {
      canonical: `/practice/${slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      images: article.image ? [{ url: article.image }] : [],
    },
  };
}

// 3. Ultra-lightweight Static Server Component
export default async function practicePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle('practice', slug);

  if (!article) {
    notFound();
  }

  // Heavy lifting done compile-time
  const htmlContent = await markdownToHtml(article.content);
  const toc = generateToc(article.content);

  return (
    <div className="container mx-auto px-4 py-8 flex gap-8">
      <article className="prose prose-slate dark:prose-invert max-w-3xl flex-1">
        <header className="mb-8">
          <span className="text-sm font-semibold text-blue-500 uppercase tracking-wider">
            {article.category}
          </span>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight mb-2">
            {article.title}
          </h1>
          <div className="text-sm text-gray-500 flex gap-4">
            {article.updated && <time>Updated: {article.updated}</time>}
            <span>{article.readingTime}</span>
          </div>
        </header>

        {/* Browser receives pure, styled, production-ready HTML */}
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </article>

      {/* Static Table of Contents sidebar */}
      {toc.length > 0 && (
        <aside className="hidden xl:block w-64 shrink-0 strict-toc">
          <div className="sticky top-8">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
              On This Page
            </h4>
            <ul className="space-y-2 text-sm">
              {toc.map((item) => (
                <li
                  key={item.id}
                  style={{ paddingLeft: `${(item.level - 2) * 12}px` }}
                >
                  <a
                    href={`#${item.id}`}
                    className="text-gray-600 dark:text-gray-400 hover:underline"
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </div>
  );
}