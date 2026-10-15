import { chromium } from 'playwright';

async function takeScreenshot(url: string, outputPath: string, width: number) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height: 800 }
  });
  const page = await context.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outputPath, fullPage: true });
  
  await browser.close();
  console.log(`Screenshot saved to ${outputPath}`);
}

const url = process.argv[2] || 'http://localhost:4321/';
const output = process.argv[3] || 'screenshot.png';
const width = parseInt(process.argv[4] || '390');

takeScreenshot(url, output, width)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
