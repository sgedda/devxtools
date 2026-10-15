import { chromium } from 'playwright';

async function inspectPage(url: string, width: number) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height: 800 }
  });
  const page = await context.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle' });
  
  const info = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const main = document.querySelector('main');
    const container = document.querySelector('.container');
    const article = document.querySelector('article.comparison');
    
    function getInfo(el: Element | null, name: string) {
      if (!el) return null;
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const style = window.getComputedStyle(htmlEl);
      return {
        name: name,
        tagName: htmlEl.tagName,
        scrollWidth: htmlEl.scrollWidth,
        clientWidth: htmlEl.clientWidth,
        offsetWidth: htmlEl.offsetWidth,
        rectWidth: rect.width,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
        maxWidth: style.maxWidth,
        width: style.width,
      };
    }
    
    return {
      viewportWidth: html.clientWidth,
      html: getInfo(html, 'html'),
      body: getInfo(body, 'body'),
      main: getInfo(main, 'main'),
      container: getInfo(container, '.container'),
      article: getInfo(article, 'article.comparison'),
    };
  });
  
  console.log(JSON.stringify(info, null, 2));
  
  await browser.close();
}

const url = process.argv[2] || 'http://localhost:4321/comparisons/msw-vs-nock/';
const width = parseInt(process.argv[3] || '390');

inspectPage(url, width)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
