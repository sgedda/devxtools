import json
from playwright.sync_api import sync_playwright
U='file:///workspace/devxtools/readability/mockup-after.html'
M="""()=>{const p=document.querySelector('.dx-prose > p'); const s=getComputedStyle(p);
 const r=document.createRange(); r.selectNodeContents(p); const rects=[...r.getClientRects()];
 const lines=new Set(rects.map(x=>Math.round(x.top))).size; const chars=p.textContent.length;
 const t=document.querySelector('.dx-table'); const sc=t.querySelector('.dx-table__scroll');
 return {fs:s.fontSize, lh:s.lineHeight, pWidth:p.getBoundingClientRect().width, avgCharsPerLine:Math.round(chars/lines),
  h2:getComputedStyle(document.querySelector('.dx-prose h2')).fontSize, table1:{scrollW:sc.scrollWidth, clientW:sc.clientWidth, overflow:t.dataset.overflow||null},
  docOverflow:document.documentElement.scrollWidth>innerWidth}}"""
res={}
with sync_playwright() as pw:
  b=pw.chromium.launch()
  for w in (375,1280):
    for mode in ('light','dark'):
      ctx=b.new_context(viewport={'width':w,'height':900},device_scale_factor=2 if w==375 else 1)
      pg=ctx.new_page(); pg.goto(U+('#dark' if mode=='dark' else '')); pg.wait_for_timeout(600)
      res[f'{w}-{mode}']=pg.evaluate(M)
      pg.screenshot(path=f'shots/after-{w}-{mode}-full.png',full_page=True)
      pg.screenshot(path=f'shots/after-{w}-{mode}.png')
      for sel,name in (('.dx-table','table'),('#three-places','body'),('#running-app','diagram')):
        pg.evaluate(f"document.querySelector('{sel}').scrollIntoView({{block:'start'}}); scrollBy(0,-72)"); pg.wait_for_timeout(150)
        pg.screenshot(path=f'shots/after-{w}-{mode}-{name}.png')
      if w==375:
        pg.evaluate("const s=document.querySelector('.dx-table__scroll'); s.scrollIntoView({block:'center'}); s.scrollLeft=180"); pg.wait_for_timeout(200)
        pg.screenshot(path=f'shots/after-375-{mode}-table-scrolled.png')
        pg.keyboard.press('Tab')
      ctx.close()
  b.close()
print(json.dumps(res,indent=1)); json.dump(res,open('mockup-measurements.json','w'),indent=1)
