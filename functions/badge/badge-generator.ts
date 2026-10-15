// Badge generator for DevXTools - copied from approved design
const W: Record<string, number> = {' ':3.9,'.':3.9,'-':4.6,'·':3.9,'/':4.6,a:6.8,b:6.9,c:5.9,d:6.9,e:6.6,f:3.9,g:6.9,h:7,i:3,j:3.8,k:6.5,l:3,m:10.7,n:7,o:6.7,p:6.9,q:6.9,r:4.7,s:5.7,t:4.3,u:7,v:6.5,w:8.9,x:6.5,y:6.5,z:5.8};

export const textWidth = (s: string, size = 11): number => 
  [...s].reduce((a, c) => a + (W[c] ?? (/[A-Z]/.test(c) ? 7.6 : /\d/.test(c) ? 7 : 7)), 0) * size / 11;

const escapeMap: Record<string, string> = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'};
const esc = (s: string): string => 
  String(s).replace(/[&<>"]/g, c => escapeMap[c]);

interface ColorScheme {
  l: string;
  r: string;
  tile: string;
  chev: string;
  txt: string;
  bg: string;
  bd: string;
  t1: string;
  t2: string;
}

const C: Record<'light' | 'dark', ColorScheme> = {
  light: {l:'#27272a',r:'#4f46e5',tile:'#4f46e5',chev:'#fff',txt:'#fff',bg:'#ffffff',bd:'#e4e4e7',t1:'#18181b',t2:'#4f46e5'},
  dark: {l:'#3f3f46',r:'#6366f1',tile:'#818cf8',chev:'#18181b',txt:'#fff',bg:'#18181b',bd:'#3f3f46',t1:'#fafafa',t2:'#818cf8'}
};

const mark = (x: number, y: number, s: number, c: ColorScheme): string =>
  `<g transform="translate(${x} ${y}) scale(${s/32})"><rect width="32" height="32" rx="8" fill="${c.tile}"/><path d="M10 9L16 16L10 23M22 9L16 16L22 23" fill="none" stroke="${c.chev}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></g>`;

const FONT = 'font-family="Verdana,DejaVu Sans,Geneva,sans-serif"';

export interface BadgeOptions {
  slug?: string;
  label?: string;
  variant?: 'small' | 'large';
  theme?: 'light' | 'dark';
}

export function badge({slug = '', label = 'featured', variant = 'small', theme = 'light'}: BadgeOptions = {}): string {
  const c = C[theme];
  const title = `Featured on devxtools.dev${slug ? ' – ' + slug : ''}`;
  
  if (variant === 'small') {
    const lt = 'devxtools';
    const lw = Math.ceil(5 + 14 + 4 + textWidth(lt) + 6);
    const rw = Math.ceil(6 + textWidth(label) + 6);
    const w = lw + rw;
    const T = (x: number, s: string) => 
      `<text x="${x}" y="15" fill="#010101" fill-opacity=".3">${esc(s)}</text><text x="${x}" y="14" fill="${c.txt}">${esc(s)}</text>`;
    
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" viewBox="0 0 ${w} 20" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><linearGradient id="g" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${w}" height="20" rx="3"/></clipPath><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="${c.l}"/><rect x="${lw}" width="${rw}" height="20" fill="${c.r}"/><rect width="${w}" height="20" fill="url(#g)"/></g>${mark(5, 3, 14, c)}<g ${FONT} font-size="11" text-rendering="geometricPrecision">${T(23, lt)}${T(lw + 6, label)}</g></svg>`;
  }
  
  const top = label === 'featured' ? 'FEATURED ON' : label.toUpperCase();
  const main = 'devxtools.dev';
  const tw = Math.max(textWidth(top, 10) * 1.08, textWidth(main, 16) * 1.12);
  const w = Math.ceil(10 + 28 + 10 + tw + 14);
  const h = 44;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><rect x=".5" y=".5" width="${w-1}" height="${h-1}" rx="8" fill="${c.bg}" stroke="${c.bd}"/>${mark(10, 8, 28, c)}<g ${FONT}><text x="48" y="18" font-size="10" letter-spacing=".8" fill="${c.t1}" fill-opacity=".65">${esc(top)}</text><text x="48" y="35" font-size="16" font-weight="bold" fill="${c.t1}">devxtools<tspan fill="${c.t2}">.dev</tspan></text></g></svg>`;
}
