import json
from playwright.sync_api import sync_playwright
paths="""/guides/mock-api-react-native/
/guides/mock-api-calls-jest/
/guides/openapi-mock-server-prism/
/guides/pact-contract-testing-javascript/
/guides/faker-js-test-data-factories/
/guides/mock-api-playwright/
/guides/msw-vs-nock-vs-polly/
/testing/best-api-testing-tools/
/observability/datadog-alternatives/
/comparisons/k6-vs-jmeter/
/comparisons/opentelemetry-vs-prometheus/
/comparisons/pino-vs-winston/
/comparisons/pollyjs-alternatives/
/comparisons/msw-vs-nock/
/comparisons/bruno-vs-postman/
/comparisons/playwright-vs-cypress/
/api-development/postman-alternatives/
/blog/why-i-built-mockifyer/""".split()
JS="""() => {const a=document.querySelector('article')||document.querySelector('main'); if(!a) return {err:'no article'};
const s=e=>e?getComputedStyle(e):null; const h2=a.querySelector('h2'), p=a.querySelector('p'), li=a.querySelector('li'), ul=a.querySelector('ul');
const tables=[...a.querySelectorAll('table')]; let clipped=0, scrollable=0;
tables.forEach(t=>{ let el=t, ok=false; const need=t.scrollWidth; 
  // reachable if some ancestor up to article scrolls horizontally with scrollWidth>=need-2
  while(el&&el!==a){ const st=s(el); if((st.overflowX=='auto'||st.overflowX=='scroll') && el.scrollWidth>el.clientWidth+2){ok=true;break;} el=el.parentElement;}
  if(t.scrollWidth>t.clientWidth+2 || t.getBoundingClientRect().width>a.getBoundingClientRect().width+2){ if(ok) scrollable++; else clipped++; } });
return {h2:h2&&s(h2).fontSize+'/'+s(h2).fontWeight, pMB:p&&s(p).marginBottom, ulList:ul&&s(ul).listStyleType, liMB:li&&s(li).marginBottom,
 tables:tables.length, tablesClipped:clipped, tablesScrollable:scrollable, pageOverflowX:document.documentElement.scrollWidth>innerWidth,
 visuals:a.querySelectorAll('img, figure, svg[role=img], .mermaid').length, title:document.title.slice(0,60)} }"""
res={}
with sync_playwright() as pw:
  b=pw.chromium.launch(); ctx=b.new_context(viewport={'width':375,'height':800})
  pg=ctx.new_page()
  for p in paths:
    try:
      r=pg.goto('https://devxtools.dev'+p,wait_until='domcontentloaded',timeout=20000); pg.wait_for_timeout(600)
      d=pg.evaluate(JS); d['status']=r.status; res[p]=d
    except Exception as e: res[p]={'err':str(e)[:80]}
    print(p,res[p])
  b.close()
json.dump(res,open('live-audit-375.json','w'),indent=1)
