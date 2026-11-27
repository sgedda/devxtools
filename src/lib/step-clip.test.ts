import { describe, expect, it } from 'vitest';
import { describeStepClip, resolveStepClipSources, stepClipId, stepLabel } from './step-clip';

const BASE = '/videos/tutorials/msw-react-checkout/step-1-unmocked-baseline';

describe('resolveStepClipSources', () => {
  it('expands a base path into webm, mp4 and a webp poster', () => {
    expect(resolveStepClipSources({ src: BASE })).toEqual({
      webm: `${BASE}.webm`,
      mp4: `${BASE}.mp4`,
      poster: `${BASE}.webp`,
    });
  });

  it('tolerates a base path that already has an extension', () => {
    expect(resolveStepClipSources({ src: `${BASE}.mp4` }).webm).toBe(`${BASE}.webm`);
  });

  it('lets explicit files override the derived ones', () => {
    const sources = resolveStepClipSources({ src: BASE, poster: '/custom/poster.png' });
    expect(sources.poster).toBe('/custom/poster.png');
    expect(sources.mp4).toBe(`${BASE}.mp4`);
  });

  it('works with explicit mp4 + poster and no webm', () => {
    expect(resolveStepClipSources({ mp4: '/a.mp4', poster: '/a.webp' })).toEqual({
      mp4: '/a.mp4',
      webm: undefined,
      poster: '/a.webp',
    });
  });

  it('throws a helpful error when there is nothing to play', () => {
    expect(() => resolveStepClipSources({})).toThrow(/needs either `src`/);
    expect(() => resolveStepClipSources({ mp4: '/a.mp4' })).toThrow(/`mp4` and `poster`/);
  });
});

describe('describeStepClip', () => {
  it('matches the existing figure caption wording', () => {
    expect(describeStepClip({ duration: 9.4 })).toBe('(Video, 9 s, no audio.)');
  });
  it('omits unknown durations and audio notes for unmuted clips', () => {
    expect(describeStepClip({})).toBe('(Video, no audio.)');
    expect(describeStepClip({ duration: 0, muted: false })).toBe('(Video.)');
  });
});

describe('stepLabel', () => {
  it('formats numbers and short labels', () => {
    expect(stepLabel(3)).toBe('Step 3.');
    expect(stepLabel('3a')).toBe('Step 3a.');
    expect(stepLabel('Step 4')).toBe('Step 4.');
    expect(stepLabel(undefined)).toBeUndefined();
    expect(stepLabel('')).toBeUndefined();
  });
});

describe('stepClipId', () => {
  it('derives a stable, valid id from the file name and step', () => {
    const sources = resolveStepClipSources({ src: BASE });
    expect(stepClipId(sources, 1)).toBe('step-clip-step-1-unmocked-baseline-1');
    expect(stepClipId(sources)).toBe('step-clip-step-1-unmocked-baseline');
  });
});
