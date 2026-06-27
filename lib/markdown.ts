import { marked } from 'marked';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypePrettyCode from 'rehype-pretty-code';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface CodeToken {
  type: 'code';
  lang: string;
  text: string;
}

function getLangLabel(lang: string): string {
  const labels: Record<string, string> = {
    js: 'JavaScript', javascript: 'JavaScript',
    ts: 'TypeScript', typescript: 'TypeScript',
    jsx: 'JSX', tsx: 'TSX',
    py: 'Python', python: 'Python',
    go: 'Go', rs: 'Rust', rust: 'Rust',
    java: 'Java', cs: 'C#', csharp: 'C#',
    sh: 'Shell', bash: 'Bash', html: 'HTML', css: 'CSS',
    json: 'JSON', yaml: 'YAML', md: 'Markdown',
    mermaid: 'Mermaid', plaintext: 'Plain Text'
  };
  return labels[lang.toLowerCase()] ?? lang.toUpperCase();
}

// Generates the static Table of Contents data at build-time
export function generateToc(content: string): TocItem[] {
  const headingRegex = /^(##|###)\s+(.*)$/gm;
  const toc: TocItem[] = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    toc.push({ id, text, level });
  }
  return toc;
}

// Server-side rendering helper for single code blocks
async function highlightCode(text: string, lang: string): Promise<string> {
  if (lang === 'mermaid') {
    const id = 'mermaid-' + Math.random().toString(36).substring(2, 11);
    const enlargeIcon = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 4.5V2A.5.5 0 0 1 2 1.5h2.5M8.5 1.5H11a.5.5 0 0 1 .5.5v2.5M11.5 8.5V11a.5.5 0 0 1-.5.5H8.5M4.5 11.5H2A.5.5 0 0 1 1.5 11V8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return (
      `<div class="mermaid-wrapper">` +
        `<div class="mermaid-titlebar">` +
          `<div class="mermaid-dots"><span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span></div>` +
          `<span class="mermaid-label">Diagram</span>` +
          `<button class="mermaid-enlarge-btn" data-enlarge="${id}" title="Enlarge diagram">${enlargeIcon}</button>` +
        `</div>` +
        `<div class="mermaid-container" id="${id}"><div class="mermaid">${text}</div></div>` +
      `</div>`
    );
  }

  // Compile code via unified + rehype-pretty-code completely on the server
  const file = await unified()
    .use(remarkParse)
    .use(() => (tree: any) => {
      tree.children = [{ type: 'code', lang, value: text }];
    })
    .use(remarkRehype)
    .use(rehypePrettyCode, { theme: 'github-dark', keepBackground: true })
    .use(rehypeStringify)
    .process('');

  return file.toString();
}

// Server-side rendering helper for Tab Groups
async function renderTabGroup(codes: CodeToken[]): Promise<string> {
  const groupId = 'tabgroup-' + Math.random().toString(36).substring(2, 11);

  const tabs = codes.map((c, i) => {
    const label = getLangLabel(c.lang || 'plaintext');
    const active = i === 0 ? 'tab-active' : '';
    return `<button class="code-tab ${active}" data-group="${groupId}" data-index="${i}">${label}</button>`;
  }).join('');

  const panels = await Promise.all(codes.map(async (c, i) => {
    const hidden = i === 0 ? '' : 'style="display:none"';
    const inner = await highlightCode(c.text, c.lang || 'plaintext');
    return `<div class="code-panel" data-group="${groupId}" data-index="${i}" ${hidden}>${inner}</div>`;
  }));

  return (
    `<div class="code-tab-group" id="${groupId}">` +
      `<div class="code-tab-bar">${tabs}</div>` +
      `<div class="code-tab-panels">${panels.join('')}</div>` +
    `</div>`
  );
}

// Core parsing pipeline executing ON BUILD
export async function markdownToHtml(markdown: string): Promise<string> {
  const tokens = marked.lexer(markdown);
  const defaultRenderer = new marked.Renderer();

  defaultRenderer.heading = ({ text, depth }) => {
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };

  defaultRenderer.table = (token) => {
    const header = token.header.map((cell: any) => `<th>${cell.text}</th>`).join('');
    const body = token.rows.map((row: any[]) => `<tr>${row.map((cell: any) => `<td>${cell.text}</td>`).join('')}</tr>`).join('');
    return `<div class="table-wrapper"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
  };

  marked.use({ renderer: defaultRenderer });

  let html = '';
  let i = 0;

  while (i < tokens.length) {
    const cur = tokens[i];
    if (cur.type === 'code') {
      const group: CodeToken[] = [{ type: 'code', lang: cur.lang ?? 'plaintext', text: cur.text }];
      let j = i + 1;
      while (j < tokens.length && tokens[j].type === 'code') {
        const nextCode = tokens[j] as any;
        group.push({ type: 'code', lang: nextCode.lang ?? 'plaintext', text: nextCode.text });
        j++;
      }
      if (group.length === 1) {
        html += await highlightCode(group[0].text, group[0].lang);
      } else {
        html += await renderTabGroup(group);
      }
      i = j;
    } else {
      html += marked.parser([cur]);
      i++;
    }
  }

  return html;
}