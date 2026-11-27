/**
 * Pure helpers behind <StepClip> (src/components/StepClip.astro).
 * Kept framework-free so they can be unit tested without rendering Astro.
 */

export interface StepClipSourceProps {
  /** Base path without extension, e.g. `/videos/tutorials/msw-react-checkout/step-1-unmocked-baseline`.
   *  Expands to `<src>.webm`, `<src>.mp4` and `<src>.webp`. */
  src?: string;
  /** Explicit files. Each one overrides the file derived from `src`. */
  mp4?: string;
  webm?: string;
  poster?: string;
}

export interface StepClipSources {
  mp4: string;
  webm?: string;
  poster: string;
}

const EXTENSION = /\.(mp4|webm|webp|png|jpe?g|avif)$/i;

export function resolveStepClipSources({ src, mp4, webm, poster }: StepClipSourceProps): StepClipSources {
  const base = src?.trim().replace(EXTENSION, '');
  const resolved = {
    mp4: mp4 ?? (base ? `${base}.mp4` : undefined),
    webm: webm ?? (base ? `${base}.webm` : undefined),
    poster: poster ?? (base ? `${base}.webp` : undefined),
  };
  if (!resolved.mp4 || !resolved.poster) {
    throw new Error(
      '<StepClip> needs either `src` (a base path without extension) or both `mp4` and `poster`.',
    );
  }
  return { mp4: resolved.mp4, webm: resolved.webm, poster: resolved.poster };
}

/** "(Video, 9 s, no audio.)" — the same wording the existing figure captions use. */
export function describeStepClip({ duration, muted = true }: { duration?: number; muted?: boolean }): string {
  const parts = ['Video'];
  if (duration !== undefined && Number.isFinite(duration) && duration > 0) parts.push(`${Math.round(duration)} s`);
  if (muted) parts.push('no audio');
  return `(${parts.join(', ')}.)`;
}

/** Label shown before the caption: `step={3}` → "Step 3.", `step="3a"` → "Step 3a.", a full string is kept. */
export function stepLabel(step: number | string | undefined): string | undefined {
  if (step === undefined || step === '') return undefined;
  const text = String(step).trim();
  return /^step\b/i.test(text) ? text.replace(/\.?$/, '.') : `Step ${text}.`;
}

/** Stable id for aria-describedby, derived from the clip file name. */
export function stepClipId(sources: StepClipSources, step?: number | string): string {
  const name = sources.mp4.split('/').pop()?.replace(EXTENSION, '') ?? 'clip';
  const slug = `${name}${step !== undefined ? `-${step}` : ''}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return `step-clip-${slug}`.replace(/-+/g, '-').replace(/-$/, '');
}
