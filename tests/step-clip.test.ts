import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { existsSync, statSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import StepClip from '../src/components/StepClip.astro';

const BASE = '/videos/tutorials/msw-react-checkout';
const SLUGS = [
  'step-1-unmocked-baseline',
  'step-2-auth-expired-session',
  'step-3-paginated-search',
  'step-4-checkout-error-recovery',
  'step-5-runtime-override',
];

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

const render = (props: Record<string, unknown>, slots?: Record<string, string>) =>
  container.renderToString(StepClip, { props, slots });

describe('<StepClip>', () => {
  it('renders a lazy, CLS-free video with WebM first, MP4 fallback and a WebP poster', async () => {
    const html = await render({ src: `${BASE}/step-1-unmocked-baseline`, label: 'Orders page failing', step: 1, duration: 6 });

    expect(html).toMatch(/<video[^>]*\bpreload="none"/);
    expect(html).toMatch(/<video[^>]*\bplaysinline/);
    expect(html).toMatch(/<video[^>]*\bcontrols/);
    expect(html).toMatch(/<video[^>]*\bmuted/);
    expect(html).toMatch(/<video[^>]*\bwidth="1280"/);
    expect(html).toMatch(/<video[^>]*\bheight="720"/);
    expect(html).toContain(`poster="${BASE}/step-1-unmocked-baseline.webp"`);
    expect(html).not.toMatch(/<video[^>]*\bautoplay/);
    expect(html).not.toMatch(/<video[^>]*\bloop/);

    const webm = html.indexOf(`src="${BASE}/step-1-unmocked-baseline.webm" type="video/webm"`);
    const mp4 = html.indexOf(`src="${BASE}/step-1-unmocked-baseline.mp4" type="video/mp4"`);
    expect(webm).toBeGreaterThan(-1);
    expect(mp4).toBeGreaterThan(webm);
  });

  it('labels the video and ties it to its caption', async () => {
    const html = await render({ src: `${BASE}/step-2-auth-expired-session`, label: 'Session renewal', step: 2, duration: 7, caption: 'Silent refresh.' });

    expect(html).toContain('aria-label="Session renewal"');
    expect(html).toContain('aria-describedby="step-clip-step-2-auth-expired-session-2-caption"');
    expect(html).toContain('id="step-clip-step-2-auth-expired-session-2-caption"');
    expect(html).toContain('Step 2.');
    expect(html).toContain('Silent refresh.');
    expect(html).toContain('(Video, 7 s, no audio.)');
  });

  it('prefers rich slot content over the caption prop', async () => {
    const html = await render(
      { src: `${BASE}/step-5-runtime-override`, label: 'Out of stock', caption: 'plain' },
      { default: 'Uses <code>worker.use()</code>' },
    );
    expect(html).toContain('<code>worker.use()</code>');
    expect(html).not.toContain('plain');
  });

  it('supports explicit files, loop, unmuted and a custom size', async () => {
    const html = await render({ mp4: '/x.mp4', poster: '/x.png', label: 'X', loop: true, muted: false, width: 960, height: 540 });
    expect(html).not.toContain('video/webm');
    expect(html).toMatch(/<video[^>]*\bloop/);
    expect(html).not.toMatch(/<video[^>]*\bmuted/);
    expect(html).toMatch(/<video[^>]*\bwidth="960"/);
    expect(html).toContain('--dx-step-clip-ratio: 960 / 540');
    expect(html).toContain('(Video.)');
  });

  it('has a no-JS download fallback', async () => {
    const html = await render({ src: `${BASE}/step-3-paginated-search`, label: 'Search' });
    expect(html).toMatch(/<noscript>.*href="\/videos\/tutorials\/msw-react-checkout\/step-3-paginated-search\.mp4"/s);
  });

  it('fails the build with a clear message when misconfigured', async () => {
    await expect(render({ label: 'Nothing' })).rejects.toThrow(/needs either `src`/);
    await expect(render({ src: `${BASE}/step-1-unmocked-baseline`, label: ' ' })).rejects.toThrow(/needs a `label`/);
  });
});

describe('MSW React checkout tutorial media', () => {
  it.each(SLUGS)('%s ships an mp4, webm and webp poster within budget', (slug) => {
    for (const ext of ['mp4', 'webm', 'webp']) {
      const file = `public${BASE}/${slug}.${ext}`;
      expect(existsSync(file), file).toBe(true);
      const kb = statSync(file).size / 1024;
      expect(kb, `${file} size`).toBeGreaterThan(ext === 'webp' ? 5 : 20);
      expect(kb, `${file} size`).toBeLessThan(500);
    }
  });
});
