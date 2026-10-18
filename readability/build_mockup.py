import re, pathlib
root=pathlib.Path(__file__).parent
def svg(name, alt):
  out=[]
  for mode in ('light','dark'):
    s=(root/'diagrams/svg'/f'{name}-{mode}.svg').read_text()
    w=float(re.search(r'viewBox="[-\d.]+ [-\d.]+ ([\d.]+)',s).group(1))
    s=re.sub(r'<svg id="([^"]+)" width="[^"]*"', lambda m: f'<svg id="{m.group(1)}" class="mmd-{mode}" style="--w:{round(w)}px" focusable="false"', s, count=1)
    s=re.sub(r'(<svg[^>]*?) height="[^"]*"', r'\1', s, count=1)
    s=re.sub(r'(<svg[^>]*?)style="max-width:[^"]*"', r'\1', s, count=1)
    s=s.replace('role="graphics-document document"', f'role="img" aria-label="{alt}"',1)
    out.append(s)
  return '\n'.join(out)

ALT1="Flowchart. Where does the code run? Jest and RNTL in Node: use MSW's msw/node. The running app: if adding mock code to the app is OK, use an in-app interceptor (msw 2 msw/native, Mirage JS or record/replay); if not, point the base URL at a mock server (Prism, Mockoon, WireMock). E2E with Detox or Maestro: a launch argument picks a scenario for either option."
ALT2="Flowchart. The screen calls fetch. A guard checks __DEV__ and the API_MOCKING flag. If off (release build) the request goes to the real API. If on with in-app mocking, an interceptor patches fetch and a handler returns JSON without a network call. If on with a base URL, the request goes to a mock server on port 4010."

INFO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
WARN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>'
ARROW='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>'

html=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Readability mockup: How to Mock APIs in React Native</title>
<script>if(location.hash==='#dark')document.documentElement.classList.add('dark')</script>
<style>
@font-face{{font-family:Inter;font-style:normal;font-weight:100 900;font-display:swap;src:url(assets/Inter-roman.var.woff2) format('woff2')}}
*,*::before,*::after{{box-sizing:border-box}} html{{-webkit-text-size-adjust:100%}}
body{{margin:0;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;background:#fff;color:#18181b}}
.dark body{{background:#09090b;color:#fafafa}}
@layer base{{h1,h2,h3,p,ul,ol,figure,blockquote,pre{{margin:0}} img,svg{{max-width:100%}}}} /* layered like Tailwind preflight */
/* mockup chrome only (stands in for Layout.astro) */
.hdr{{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:.6rem;height:56px;padding:0 1.25rem;border-bottom:1px solid #e4e4e7;background:rgb(255 255 255/.9);backdrop-filter:blur(8px);font-weight:700;font-size:17px}}
.dark .hdr{{border-color:#27272a;background:rgb(9 9 11/.9)}}
.logo{{width:28px;height:28px;border-radius:7px;background:#4f46e5;display:grid;place-items:center;color:#fff;font-size:15px}}
.hdr b{{color:#4f46e5}} .dark .hdr b{{color:#818cf8}}
.tag{{margin-left:auto;font-size:12px;font-weight:600;padding:.2rem .55rem;border-radius:999px;background:#eef2ff;color:#4338ca}} .dark .tag{{background:rgb(99 102 241/.15);color:#c7d2fe}}
.wrap{{max-width:56rem;margin:0 auto;padding:2rem 1.25rem 4rem}}
.crumbs{{font-size:.875rem;color:#71717a;margin-bottom:1.5rem}}
.page-h1{{font-size:2rem;line-height:1.15;font-weight:800;letter-spacing:-.025em;margin-bottom:1rem;max-width:22ch}}
@media(min-width:1024px){{.page-h1{{font-size:2.5rem}}}}
.meta{{margin-bottom:2rem}}
.tok-c{{color:#6e7781}} .tok-k{{color:#cf222e}} .tok-s{{color:#0a3069}} .tok-f{{color:#8250df}}
.dark .tok-c{{color:#8b949e}} .dark .tok-k{{color:#ff7b72}} .dark .tok-s{{color:#a5d6ff}} .dark .tok-f{{color:#d2a8ff}}
</style>
<style>@layer base, components;</style>
<link rel="stylesheet" href="article.css">
</head><body>
<header class="hdr"><span class="logo">✕</span>DevX<b>Tools</b><span class="tag">AFTER · readability mockup</span></header>
<main class="wrap">
<nav class="crumbs">Home / Guides / Mock API in React Native</nav>
<h1 class="page-h1">How to Mock APIs in React Native</h1>
<div class="dx-prose meta">
<aside class="dx-callout dx-callout--note">{INFO}<div><p><strong>Disclosure.</strong> devxtools.dev is run by Sebastian Gedda, who also builds and maintains Mockifyer, one of the tools in this guide. MSW and Mirage get at least as much space, and Mockifyer is never ranked first.</p></div></aside>
<blockquote><p><strong>Tested with</strong> React Native 0.88.0, React 19.3.1, Jest 30.5.2, @testing-library/react-native 14.1.0, msw 2.15.0; Node 22.23.3; 2026-10-15. Not run on a simulator or device.</p></blockquote>
</div>

<div class="dx-prose">
<p>To mock APIs in React Native, you need different tools for three different places: Jest tests, the running app in a simulator, and end-to-end tests with Detox or Maestro. This guide covers each one: MSW in Jest (tested), MSW and Expo in the running app (including the MSW 3 change that broke the old setup), Mirage JS, mock servers and the Android <code>10.0.2.2</code> gotcha, record/replay, and debugging tools.</p>

<h2 id="tldr">TL;DR</h2>
<p>For React Native, use MSW (<code>msw/node</code>) in Jest tests. For the running app, MSW 3’s <code>@msw/react-native</code> isn’t on npm yet (we got a registry 404 on 2026-10-15), so pin msw 2’s <code>msw/native</code> or point the app at a mock server. Use Mirage JS when you want an in-memory fake backend, a mock server like Mockoon or Prism for E2E, and a record/replay tool when you want to capture real responses.</p>

<div class="dx-table" style="--cols:5">
 <div class="dx-table__scroll" role="region" aria-label="Table: TL;DR (scrolls horizontally)" tabindex="0">
 <table>
  <thead><tr><th scope="col">Approach</th><th scope="col">Jest tests</th><th scope="col">Running app</th><th scope="col">E2E (Detox/Maestro)</th><th scope="col">Records real traffic</th></tr></thead>
  <tbody>
   <tr><th scope="row">MSW (<code>msw/node</code>; in-app via msw 2 <code>msw/native</code>)</th><td>Yes (tested)</td><td>Yes (msw 2)</td><td>Yes (app built with mocks)</td><td>No</td></tr>
   <tr><th scope="row">Mirage JS</th><td>Yes</td><td>Yes</td><td>Yes</td><td>No</td></tr>
   <tr><th scope="row">Mock server (Mockoon / Prism / WireMock)</th><td>Possible</td><td>Yes (via base URL)</td><td>Yes</td><td>Mockoon, WireMock: yes</td></tr>
   <tr><th scope="row">Mockifyer*</th><td>Node/Jest entry point per README</td><td>Yes (per README)</td><td>Yes, launch-argument scenarios (per README)</td><td>Yes</td></tr>
  </tbody>
 </table>
 </div>
</div>
<p class="dx-table__hint" aria-hidden="true">Swipe the table to see all 5 columns {ARROW}</p>
<p style="font-size:.875rem;color:var(--dx-muted)">*Built and maintained by the owner of devxtools.dev.</p>

<h2 id="three-places">Three places you need mocks</h2>
<ol>
 <li><strong>Jest tests (unit and component).</strong> Jest runs in Node, not on a device. You can use MSW’s Node integration, and you’re testing components with React Native Testing Library (RNTL).</li>
 <li><strong>The running app (simulator, device, Expo Go or a dev build).</strong> No Node and no Service Worker. Mocks must patch <code>fetch</code>/<code>XMLHttpRequest</code> inside the JS runtime, or the app must call a different base URL.</li>
 <li><strong>E2E (Detox, Maestro).</strong> A real build runs on a simulator or device. You either bundle in-app mocks (switched on by a launch argument or env var), or point the build at a mock server you control from the test.</li>
</ol>
<figure class="dx-diagram">
 <div class="dx-figure__frame" role="group" tabindex="0" aria-label="Diagram, scrolls horizontally">
{svg('where-code-runs', ALT1)}
 </div>
 <figcaption><strong>Figure 1.</strong> Pick the mock by where the code runs, not by tool popularity.</figcaption>
</figure>
<p>Most confusion comes from using a tool designed for one place in another.</p>

<h2 id="jest">Mocking in Jest and RNTL with MSW</h2>
<p>MSW intercepts <code>fetch</code> at the network level, so your component calls the real <code>fetch</code> and your tests describe responses, not implementation details. This is the setup we ran with React Native 0.88:</p>
<pre tabindex="0"><code><span class="tok-c">// src/mocks/handlers.js</span>
<span class="tok-k">import</span> {{ http, HttpResponse }} <span class="tok-k">from</span> <span class="tok-s">'msw'</span>;
<span class="tok-k">import</span> {{ API_URL }} <span class="tok-k">from</span> <span class="tok-s">'../api'</span>;

<span class="tok-k">export const</span> handlers = [
  http.<span class="tok-f">get</span>(<span class="tok-s">`${{API_URL}}/users/:id`</span>, ({{ params }}) =&gt;
    HttpResponse.<span class="tok-f">json</span>({{ id: <span class="tok-f">Number</span>(params.id), name: <span class="tok-s">'Ada Lovelace'</span> }})),
];</code></pre>
<p>Both tests passed. Three things tripped us up, and they’ll trip you up too:</p>
<ul>
 <li><strong>Jest config for ESM dependencies.</strong> msw 2.15 depends on ESM-only packages shipped as <code>.mjs</code> (<code>rettime</code>, <code>@open-draft/deferred-promise</code>). The React Native preset doesn’t transform them, so we got <code>Must use import to load ES Module</code>.</li>
 <li><strong>RNTL 14’s <code>render</code> is async.</strong> Without <code>await render(...)</code> we got “<code>render</code> function has not been called”.</li>
 <li><strong>MSW 3 vs MSW 2 in Jest.</strong> We used msw 2.15 so the same version works in Jest and in the app. MSW 3 renamed <code>onUnhandledRequest</code> to <code>onUnhandledFrame</code>.</li>
</ul>

<h2 id="running-app">Mocking in the running app</h2>
<figure class="dx-diagram">
 <div class="dx-figure__frame" role="group" tabindex="0" aria-label="Diagram, scrolls horizontally">
{svg('request-flow', ALT2)}
 </div>
 <figcaption><strong>Figure 2.</strong> One guard, two ways to mock: patch <code>fetch</code> inside the app, or send it to a mock server. Release builds always hit the real API.</figcaption>
</figure>
<h3 id="msw3">MSW in the app: the MSW 3 situation</h3>
<p>MSW 3.0 (released 2026-09-28) removed the <code>msw/native</code> export. MSW’s docs now tell you to install <code>@msw/react-native</code>, but on 2026-10-15 <code>npm install @msw/react-native</code> fails with a 404: the package isn’t published.</p>
<aside class="dx-callout dx-callout--warn">{WARN}<div><p><strong>Until it ships:</strong> pin <code>msw@2.15.x</code> (the last 2.x still exports <code>./native</code>) or point the app at a mock server. Recheck <code>npm view @msw/react-native</code> before you start.</p></div></aside>

<h3 id="toggling">Toggling mocks with <code>__DEV__</code>, env vars or a dev menu</h3>
<ul>
 <li><code>__DEV__</code> is <code>false</code> in release builds. Use it as an outer guard so mocks can never ship enabled.</li>
 <li>An env var (<code>EXPO_PUBLIC_API_MOCKING</code>, or <code>react-native-config</code> in bare apps) chooses mocks per Metro session.</li>
 <li>A dev-menu or in-app switch lets QA change scenarios without rebuilding.</li>
</ul>
<figure>
 <div class="dx-figure__frame"><img src="assets/rn-sample-500-scenario.png" width="800" height="550" loading="lazy" alt="Two screens from the devxtools React Native sample app. Left: the task list shows 'No tasks yet' with a 'Mocked · Server error 500' badge. Right: the Lab panel with MSW selected, the 'Server error 500' scenario chip highlighted, and the request log listing GET /tasks returning 500."></div>
 <figcaption><strong>Figure 3.</strong> An in-app scenario switch in the <a href="https://github.com/sgedda/devxtools-rn-sample">devxtools RN sample</a>: choosing “Server error 500” changes what <code>fetch</code> returns without a rebuild, and the request log shows which handler answered.</figcaption>
</figure>

<h2 id="mock-server">Pointing the app at a mock server</h2>
<p>A mock server runs on your machine (or in CI), and the app’s base URL points at it. Which host does the app use?</p>
<div class="dx-table" style="--cols:2">
 <div class="dx-table__scroll" role="region" aria-label="Table: Which host does the app use?" tabindex="0">
 <table>
  <thead><tr><th scope="col">Where the app runs</th><th scope="col">URL for a server on your machine</th></tr></thead>
  <tbody>
   <tr><th scope="row">iOS Simulator</th><td><code>http://localhost:4010</code> (shares the Mac’s network)</td></tr>
   <tr><th scope="row">Android Emulator</th><td><code>http://10.0.2.2:4010</code> (the emulator’s alias for host loopback)</td></tr>
   <tr><th scope="row">Android, either</th><td><code>adb reverse tcp:4010 tcp:4010</code>, then <code>http://localhost:4010</code></td></tr>
   <tr><th scope="row">Physical device</th><td>Your machine’s LAN IP, e.g. <code>http://192.168.1.20:4010</code> (bind to <code>0.0.0.0</code>)</td></tr>
  </tbody>
 </table>
 </div>
</div>
<p class="dx-table__hint" aria-hidden="true">Swipe the table to see all columns {ARROW}</p>
<hr>
<p>Plain HTTP gotchas: Android blocks cleartext HTTP by default for apps targeting API 28+, and iOS App Transport Security restricts plain HTTP too.</p>
</div>
</main>
<script>
/* Production: ~20 lines in Layout.astro, replacing the current table-wrapping script.
   Sets data-overflow="end|both|start" and data-scrolled on each .dx-table. */
(() => {{
  const update = (box, sc) => {{
    const max = sc.scrollWidth - sc.clientWidth;
    if (max <= 1) {{ box.removeAttribute('data-overflow'); box.removeAttribute('data-scrolled'); sc.removeAttribute('tabindex'); return; }}
    sc.setAttribute('tabindex', '0');
    const x = Math.abs(sc.scrollLeft);
    box.dataset.overflow = x < 2 ? 'end' : x >= max - 2 ? 'start' : 'both';
    box.toggleAttribute('data-scrolled', x > 2);
  }};
  // diagram frames: tab stop only when they actually scroll
  document.querySelectorAll('.dx-diagram .dx-figure__frame').forEach(f => {{
    const run = () => f.scrollWidth > f.clientWidth + 1 ? f.setAttribute('tabindex','0') : f.removeAttribute('tabindex');
    new ResizeObserver(run).observe(f); run();
  }});
  document.querySelectorAll('.dx-table').forEach(box => {{
    const sc = box.querySelector('.dx-table__scroll');
    const run = () => update(box, sc);
    sc.addEventListener('scroll', run, {{ passive: true }});
    new ResizeObserver(run).observe(sc);
    run();
  }});
}})();
</script>
</body></html>'''
(root/'mockup-after.html').write_text(html); print('written', len(html))
