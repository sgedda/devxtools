import json
from playwright.sync_api import sync_playwright
URL="https://devxtools.dev/guides/mock-api-react-native/"
JS="""() => {
 const a=document.querySelector('article');
 const cs=(el,props)=>{ if(!el) return null; const s=getComputedStyle(el); const o={}; props.forEach(p=>o[p]=s[p]); return o;};
 const P=['fontSize','lineHeight','fontWeight','marginTop','marginBottom','paddingLeft','listStyleType','color','maxWidth','width'];
 const q=s=>a.querySelector(s);
 const t=q('table'); const w=t&&t.parentElement;
 return {
  articleWidth:a.getBoundingClientRect().width,
  p:cs(q(':scope > p'),P), h1:cs(q('h1'),P), h2:cs(q('h2'),P), h3:cs(q('h3'),P),
  ul:cs(q('ul'),P), ol:cs(q('ol'),P), li:cs(q('li'),P),
  pre:cs(q('pre'),['fontSize','lineHeight','marginTop','marginBottom','padding','borderRadius','backgroundColor','border']),
  code:cs(q('p code'),['fontSize','color','backgroundColor','padding']),
  blockquote:cs(q('blockquote'),P.concat(['borderLeft','backgroundColor'])),
  table:cs(t,['display','overflow','overflowX','width','fontSize','marginTop','marginBottom']),
  tableScrollW:t&&t.scrollWidth, tableClientW:t&&t.clientWidth,
  wrapperClass:w&&w.className, wrapper:cs(w,['overflowX','position']), wrapperScrollW:w&&w.scrollWidth, wrapperClientW:w&&w.clientWidth,
  td:cs(t&&t.querySelector('tbody td, tbody th'),['padding','minWidth','borderBottom']),
  tr:cs(t&&t.querySelector('tbody tr'),['borderBottom','backgroundColor']),
  docScrollW:document.documentElement.scrollWidth, vw:innerWidth,
  charsPerLine:(()=>{const p=q(':scope > p'); if(!p) return null; const fs=parseFloat(getComputedStyle(p).fontSize); return Math.round(p.getBoundingClientRect().width/(fs*0.5));})(),
  imgs:a.querySelectorAll('img,svg:not([class*=lucide])').length
 };}"""
out={}
with sync_playwright() as pw:
  b=pw.chromium.launch()
  for w in (375,1280):
    for scheme in ('light','dark'):
      ctx=b.new_context(viewport={'width':w,'height':900},color_scheme=scheme,device_scale_factor=2 if w==375 else 1)
      pg=ctx.new_page(); pg.goto(URL,wait_until='networkidle')
      if scheme=='dark':
        pg.evaluate("document.documentElement.classList.add('dark')")
      pg.wait_for_timeout(500)
      if scheme=='light': out[w]=pg.evaluate(JS)
      pg.screenshot(path=f'shots/before-{w}-{scheme}.png',full_page=False)
      # also scroll to first table
      pg.evaluate("document.querySelector('article table').scrollIntoView({block:'start'}); scrollBy(0,-80)")
      pg.wait_for_timeout(200)
      pg.screenshot(path=f'shots/before-{w}-{scheme}-table.png')
      pg.evaluate("[...document.querySelectorAll('article h2')].find(h=>h.textContent.includes('Three places')).scrollIntoView({block:'start'}); scrollBy(0,-80)")
      pg.wait_for_timeout(200)
      pg.screenshot(path=f'shots/before-{w}-{scheme}-body.png')
      ctx.close()
  b.close()
print(json.dumps(out,indent=1))
json.dump(out,open('live-measurements.json','w'),indent=1)
