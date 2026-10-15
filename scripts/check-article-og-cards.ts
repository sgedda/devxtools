import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

interface Article {
  slug: string;
  type: 'guide' | 'comparison';
}

function loadArticles(): Article[] {
  const articlesDir = join(process.cwd(), 'src', 'content', 'articles');
  const articleFiles = readdirSync(articlesDir).filter(f => f.endsWith('.md'));
  const articles: Article[] = [];

  for (const file of articleFiles) {
    const filePath = join(articlesDir, file);
    const content = readFileSync(filePath, 'utf-8');
    const { data } = matter(content);
    
    const slugPath = data.slug as string;
    const slug = slugPath.split('/').filter(Boolean).pop() || '';
    
    if (slugPath.includes('/guides/')) {
      articles.push({ slug, type: 'guide' });
    } else if (slugPath.includes('/comparisons/')) {
      articles.push({ slug, type: 'comparison' });
    }
  }

  return articles;
}

function checkArticleOGCards() {
  const articles = loadArticles();
  const guides = articles.filter(a => a.type === 'guide');
  const comparisons = articles.filter(a => a.type === 'comparison');
  let missing = 0;

  console.log('Checking guide OG cards...');
  for (const { slug } of guides) {
    const path = join(process.cwd(), 'public', 'og-guides', `${slug}.png`);
    if (!existsSync(path)) {
      console.log(`✗ Missing: og-guides/${slug}.png`);
      missing++;
    } else {
      console.log(`✓ Found: og-guides/${slug}.png`);
    }
  }

  console.log('\nChecking comparison OG cards...');
  for (const { slug } of comparisons) {
    const path = join(process.cwd(), 'public', 'og-comparisons', `${slug}.png`);
    if (!existsSync(path)) {
      console.log(`✗ Missing: og-comparisons/${slug}.png`);
      missing++;
    } else {
      console.log(`✓ Found: og-comparisons/${slug}.png`);
    }
  }

  if (missing > 0) {
    console.error(`\n✗ ${missing} OG card(s) missing. Run 'npm run og:articles' to generate them.`);
    process.exit(1);
  } else {
    console.log('\n✓ All article OG cards present.');
  }
}

checkArticleOGCards();
