const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch();
 const U='https://wanderweird-guide.devxtools-ez4.pages.dev/guides/wanderweird-mockifyer-demo/';
 for (const [name,opts] of [['mobile-dark',{viewport:{width:375,height:812},deviceScaleFactor:2,colorScheme:'dark',isMobile:true,hasTouch:true}],['desktop-light',{viewport:{width:1280,height:900},colorScheme:'light'}],['desktop-reduced',{viewport:{width:1280,height:900},reducedMotion:'reduce'}]]){
  const c=await b.newContext(opts); const p=await c.newPage();
  let bytes=0; const types={};
  p.on('response',async r=>{try{const u=r.url(); if(u.includes('/assets/wanderweird/')){const l=(await r.body()).length;bytes+=l;types[u.split('/').pop()]=l}}catch(e){}});
  await p.goto(U,{waitUntil:'networkidle'});
  if(name==='mobile-dark'){ await p.evaluate(()=>{document.documentElement.classList.add('dark')}); }
  const info=await p.evaluate(()=>({dark:document.documentElement.classList.contains('dark'),overflow:document.documentElement.scrollWidth-window.innerWidth,figs:document.querySelectorAll('figure').length,svgVisible:[...document.querySelectorAll('svg.mmd-light,svg.mmd-dark')].map(s=>s.classList[0]+':'+getComputedStyle(s).display)}));
  // scroll through
  const H=await p.evaluate(()=>document.body.scrollHeight);
  for(let y=0;y<H;y+=600){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(120);}
  await p.waitForTimeout(800);
  const vids=await p.evaluate(()=>[...document.querySelectorAll('.dx-figure--video')].map(f=>{const v=f.querySelector('video'),btn=f.querySelector('button');return {paused:v.paused,src:v.currentSrc.split('/').pop(),btnHidden:btn.hidden,label:btn.getAttribute('aria-label'),pos:getComputedStyle(f.querySelector('.dx-figure__frame')).position}}));
  // scroll to video 2 and check play + offscreen pause
  await p.evaluate(()=>document.querySelectorAll('.dx-figure--video video')[1].scrollIntoView({block:'center'})); await p.waitForTimeout(1500);
  const inview=await p.evaluate(()=>[...document.querySelectorAll('.dx-figure--video video')].map(v=>v.paused));
  if(name==='desktop-light'){ await p.click('.dx-figure--video:nth-of-type(1) button',{trial:true}).catch(()=>{}); const btn=(await p.$$('.dx-video__toggle'))[1]; await btn.click(); await p.waitForTimeout(300); var afterClick=await p.evaluate(()=>[document.querySelectorAll('.dx-figure--video video')[1].paused, document.querySelectorAll('.dx-video__toggle')[1].getAttribute('aria-label')]); }
  const ring=await p.evaluate(()=>{const f=document.querySelector('.dx-figure--shot .dx-figure__frame');return getComputedStyle(f,'::after').boxShadow});
  console.log(name,JSON.stringify({info,vids,inview,afterClick,ring,mediaBytes:bytes,files:Object.keys(types).length}));
  await p.evaluate(()=>scrollTo(0,0));
  await p.screenshot({path:`/tmp/ww/${name}-top.png`});
  await p.evaluate(()=>document.querySelector('[data-diagram]').scrollIntoView()); await p.screenshot({path:`/tmp/ww/${name}-diagram.png`});
  await p.evaluate(()=>document.querySelector('.dx-figure--narrow').scrollIntoView()); await p.screenshot({path:`/tmp/ww/${name}-devmenu.png`});
  await c.close();
 }
 await b.close();
})();
