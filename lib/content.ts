import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import type { MindmapData, MindNode } from './mindmap';
import { MANIFEST as STATIC_MANIFEST } from './manifest';



export const MANIFEST = STATIC_MANIFEST;
export const CATEGORY_ORDER = [
  'Backend Design',
  'High Level Design',
  'Low Level Design',
  'Web Security',
  'SEO',
  'Design',
  'Networking',
];
export const CATEGORIES = MANIFEST.reduce<Record<string, typeof MANIFEST>>((acc, item) => {
  (acc[item.category] ??= []).push(item);
  return acc;
}, {});
export type ArticleMeta = ArticleMetadata;

const CONTENT_DIR = path.join(process.cwd(), 'content');

export type ContentType = 'docs' | 'mindmap' | 'practice';

export interface ArticleMetadata {
  slug: string;
  title: string;
  description: string;
  image?: string;
  category: string;
  updated?: string;
  readingTime: string;
  type: ContentType;
  hasMindmap: boolean;
  hasPractice: boolean;
}

export interface Article extends ArticleMetadata {
  content: string;
  raw: string;
  data: Record<string, unknown>;
}

function isContentType(type: string): type is ContentType {
  return type === 'docs' || type === 'mindmap' || type === 'practice';
}

function getTargetDirectory(type: string): string {
  if (!isContentType(type)) throw new Error(`Unsupported content type: ${type}`);
  return type === 'docs' ? CONTENT_DIR : path.join(CONTENT_DIR, type);
}

function safeSlug(slug: string): string {
  return path.basename(slug).replace(/\.md$/, '');
}

function fileExists(type: ContentType, slug: string): boolean {
  return fs.existsSync(path.join(getTargetDirectory(type), `${safeSlug(slug)}.md`));
}

export function getAllSlugs(contentType: string): string[] {
  try {
    const dir = getTargetDirectory(contentType);
    if (!fs.existsSync(dir)) return [];

    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name.replace(/\.md$/, ''))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export function getArticle(contentType: string, slug: string): Article | null {
  try {
    if (!isContentType(contentType)) return null;

    const cleanSlug = safeSlug(slug);
    const filePath = path.join(getTargetDirectory(contentType), `${cleanSlug}.md`);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);
    const title = typeof data.title === 'string' ? data.title : cleanSlug.replace(/-/g, ' ');
    const description = typeof data.description === 'string' ? data.description : '';
    const category = typeof data.category === 'string' ? data.category : 'General';
    const updated = typeof data.updated === 'string' ? data.updated : undefined;
    const image = typeof data.image === 'string' ? data.image : undefined;
    const articleSlug = typeof data.articleSlug === 'string' ? data.articleSlug : cleanSlug;

    return {
      slug: cleanSlug,
      type: contentType,
      raw,
      content,
      data,
      title,
      description,
      image,
      category,
      updated,
      readingTime: readingTime(content).text,
      hasMindmap: contentType === 'mindmap' || fileExists('mindmap', articleSlug),
      hasPractice: contentType === 'practice' || fileExists('practice', articleSlug),
    };
  } catch (error) {
    console.error(`Failed to read ${contentType}/${slug}`, error);
    return null;
  }
}

export function getAllArticles(contentType: string): ArticleMetadata[] {
  return getAllSlugs(contentType)
    .map((slug) => getArticle(contentType, slug))
    .filter((article): article is Article => article !== null)
    .map((article) => ({
      slug: article.slug,
      title: article.title,
      description: article.description,
      image: article.image,
      category: article.category,
      updated: article.updated,
      readingTime: article.readingTime,
      type: article.type,
      hasMindmap: article.hasMindmap,
      hasPractice: article.hasPractice,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getRelatedArticles(currentArticle: ArticleMetadata, limit = 3): ArticleMetadata[] {
  return getAllArticles(currentArticle.type)
    .filter((article) => article.slug !== currentArticle.slug && article.category === currentArticle.category)
    .slice(0, limit);
}

export function articleToMindmap(article: Article): MindmapData {
  const root: MindNode = { id: `${article.slug}-root`, text: article.title, depth: 0, children: [], side: 'center' };
  const stack: MindNode[] = [root];

  for (const line of article.content.split('\n')) {
    const match = /^(#{2,6})\s+(.+)$/.exec(line.trim());
    if (!match) continue;

    const depth = match[1].length - 1;
    const text = match[2].replace(/[`*_#]/g, '').trim();
    const id = `${article.slug}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    const node: MindNode = { id, text, depth, children: [] };

    while (stack.length > depth) stack.pop();
    const parent = stack[stack.length - 1] ?? root;
    parent.children.push(node);
    stack[depth] = node;
  }

  if (root.children.length === 0) {
    root.children = article.content
      .split('\n')
      .filter((line) => line.trim().startsWith('* '))
      .slice(0, 12)
      .map((line, index) => ({ id: `${article.slug}-point-${index}`, text: line.replace(/^\*\s+/, '').trim(), depth: 1, children: [] }));
  }

  return { id: article.slug, title: article.title, root };
}
