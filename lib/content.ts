import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export type ContentType = 'docs' | 'mindmap' | 'practice';

export interface ArticleMetadata {
  title: string;
  description: string;
  image?: string;
  category?: string;
  updated?: string;
  readingTime: string;
  slug: string;
  type: ContentType;
}

export interface Article extends ArticleMetadata {
  content: string;
}

// Helper to map content type to its directory path
function getTargetDirectory(type: ContentType): string {
  if (type === 'docs') return CONTENT_DIR; // Base files like api-gateway.md
  return path.join(CONTENT_DIR, type);      // content/mindmap or content/practice
}

export function getAllSlugs(type: ContentType): string[] {
  const dir = getTargetDirectory(type);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.md'))
    .map(file => file.replace(/\.md$/, ''));
}

export function getArticle(type: ContentType, slug: string): Article | null {
  try {
    const dir = getTargetDirectory(type);
    const filePath = path.join(dir, `${slug}.md`);
    
    if (!fs.existsSync(filePath)) return null;

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    const stats = readingTime(content);

    return {
      slug,
      type,
      content,
      title: data.title || 'Untitled',
      description: data.description || '',
      image: data.image || null,
      category: data.category || 'General',
      updated: data.updated || null,
      readingTime: stats.text,
    };
  } catch (error) {
    console.error(`Error reading ${type} article for slug: ${slug}`, error);
    return null;
  }
}

export function getAllArticles(type: ContentType): ArticleMetadata[] {
  const slugs = getAllSlugs(type);
  
  return slugs
    .map(slug => {
      const article = getArticle(type, slug);
      if (!article) return null;
      const { content, ...metadata } = article;
      return metadata;
    })
    .filter((item): item is ArticleMetadata => item !== null)
    .sort((a, b) => {
      if (a.updated && b.updated) {
        return new Date(b.updated).getTime() - new Date(a.updated).getTime();
      }
      return a.title.localeCompare(b.title);
    });
}

export function getRelatedArticles(currentArticle: ArticleMetadata, limit = 3): ArticleMetadata[] {
  return getAllArticles(currentArticle.type)
    .filter(article => article.slug !== currentArticle.slug && article.category === currentArticle.category)
    .slice(0, limit);
}