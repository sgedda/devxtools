import { chromium } from 'playwright';

const url = 'http://localhost:4321/api-development/postman-alternatives/';
const width = 390;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width, height: 800 }
});
const page = await context.newPage();

await page.goto(url, { waitUntil: 'networkidle' });

const info = await page.evaluate(() => {
  const results = [];
  const wrappers = document.querySelectorAll('.overflow-x-auto');
  
  wrappers.forEach((wrapper, i) => {
    const table = wrapper.querySelector('table');
    const style = window.getComputedStyle(wrapper);
    const tableStyle = table ? window.getComputedStyle(table) : null;
    
    results.push({
      index: i,
      wrapperScrollWidth: wrapper.scrollWidth,
      wrapperClientWidth: wrapper.clientWidth,
      wrapperOverflowX: style.overflowX,
      wrapperMinWidth: style.minWidth,
      tableScrollWidth: table ? table.scrollWidth : null,
      tableClientWidth: table ? table.clientWidth : null,
      tableWidth: tableStyle ? tableStyle.width : null,
    });
  });
  
  return results;
});

console.log('Overflow-x-auto wrappers:');
info.forEach(w => {
  console.log(`\nWrapper ${w.index}:`);
  console.log(`  overflow-x: ${w.wrapperOverflowX}, min-width: ${w.wrapperMinWidth}`);
  console.log(`  scrollWidth: ${w.wrapperScrollWidth}px, clientWidth: ${w.wrapperClientWidth}px`);
  if (w.tableScrollWidth) {
    console.log(`  Table scrollWidth: ${w.tableScrollWidth}px, clientWidth: ${w.tableClientWidth}px, width: ${w.tableWidth}`);
  }
});

await browser.close();
