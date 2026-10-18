"""Prototype of the build-time step: render each .mmd twice (light + dark) to static SVG."""
import json, pathlib
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).parent; cfg=json.loads((root/'mermaid-theme.json').read_text())
out=root/'diagrams'/'svg'; out.mkdir(exist_ok=True)
MJS='/tmp/mmd/node_modules/mermaid/dist/mermaid.min.js'
with sync_playwright() as pw:
  b=pw.chromium.launch(); pg=b.new_page()
  pg.goto("file:///tmp/mmd/host.html")
  pg.add_script_tag(path=MJS); pg.evaluate("document.fonts.load('14px Inter').then(()=>document.fonts.ready).then(()=>document.fonts.check('14px Inter'))"); pg.wait_for_timeout(1500)
  for f in sorted((root/'diagrams').glob('*.mmd')):
    src=f.read_text()
    for mode in ('light','dark'):
      conf=dict(cfg['common']); conf['themeVariables']=cfg[mode]['themeVariables']; conf['startOnLoad']=False
      code=src+('\n  '+cfg[mode]['accentClassDef'] if src.startswith('flowchart') else '')
      svg=pg.evaluate("""async ([conf,code,id])=>{ mermaid.initialize(conf); const r=await mermaid.render(id,code); return r.svg; }""",[conf,code,f'{f.stem}-{mode}'])
      (out/f'{f.stem}-{mode}.svg').write_text(svg); print(f.stem,mode,len(svg))
  b.close()
