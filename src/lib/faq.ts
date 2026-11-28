/**
 * Builds FAQPage structured data from an article's own "## FAQ" section.
 *
 * Every `### Question` under the FAQ heading becomes a schema.org Question, and the
 * text up to the next `###`/`##` heading becomes its acceptedAnswer, as plain text.
 * Kept framework-free so it can be unit tested without rendering Astro.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_HEADING = /^##\s+(?:FAQs?|Frequently asked questions)\b.*$/i;

/** Markdown/MDX inline content → plain text suitable for JSON-LD. */
export function markdownToPlainText(markdown: string): string {
  // Fenced code blocks don't read well as answer text; drop them.
  let text = markdown.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, ' ');

  // Protect inline code so the tag/emphasis stripping below can't touch it (e.g. `<port>`).
  const code: string[] = [];
  text = text.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, _ticks, inner: string) => {
    code.push(inner.trim());
    return `\u0000${code.length - 1}\u0000`;
  });

  text = text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images → alt text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → link text
    .replace(/<\/?[A-Za-z][^>]*>/g, ' ') // HTML / JSX tags
    .replace(/^\s{0,3}>\s?/gm, '') // blockquotes
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '') // list markers
    .replace(/(\*\*|__)(.+?)\1/g, '$2') // bold
    .replace(/(^|[^\w*])[*_]([^*_\s][^*_]*?)[*_](?=[^\w*]|$)/g, '$1$2') // italics
    .replace(/\u0000(\d+)\u0000/g, (_, i: string) => code[Number(i)]);

  return text.replace(/\s+/g, ' ').trim();
}

/** Extracts the FAQ question/answer pairs from an article's raw Markdown/MDX body. */
export function extractFaq(body: string | undefined): FaqItem[] {
  if (!body) return [];
  const lines = body.split(/\r?\n/);
  const items: FaqItem[] = [];
  let inFaq = false;
  let inFence = false;
  let current: { question: string; lines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const answer = markdownToPlainText(current.lines.join('\n'));
    if (current.question && answer) items.push({ question: current.question, answer });
    current = null;
  };

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence) {
      if (/^##\s/.test(line)) {
        flush();
        inFaq = FAQ_HEADING.test(line);
        continue;
      }
      if (inFaq && /^###\s/.test(line)) {
        flush();
        current = { question: markdownToPlainText(line.replace(/^###\s+/, '').replace(/\s*\{#[^}]*\}\s*$/, '')), lines: [] };
        continue;
      }
      if (/^#\s/.test(line) || /^-{3,}\s*$/.test(line)) {
        flush();
        if (/^#\s/.test(line)) inFaq = false;
        continue;
      }
    }
    if (inFaq && current) current.lines.push(line);
  }
  flush();
  return items;
}

/** schema.org FAQPage node for an @graph, or null when the article has no FAQ entries. */
export function buildFaqPageSchema(items: FaqItem[]) {
  if (items.length === 0) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}
