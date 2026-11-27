import { describe, expect, it } from 'vitest';
import { buildFaqPageSchema, extractFaq, markdownToPlainText } from './faq';

const body = `
## What you'll build

### Not a FAQ entry

Intro text that must not become a question.

## FAQ

### Should I mock with **MSW** or \`page.route\`?

Use MSW when mocks live with the app. See [the Playwright guide](/guides/mock-api-playwright/).

### Does it work on Android?

Use \`http://10.0.2.2:<port>\` on the emulator.

\`\`\`ts
// ## not a heading
const x = 1
\`\`\`

- **Bold** item
- <code>tag</code> item

## Related

[MSW](/tools/msw/)
`;

describe('extractFaq', () => {
  it('only reads ### questions inside the ## FAQ section, with their real answers', () => {
    expect(extractFaq(body)).toEqual([
      {
        question: 'Should I mock with MSW or page.route?',
        answer: 'Use MSW when mocks live with the app. See the Playwright guide.',
      },
      {
        question: 'Does it work on Android?',
        answer: 'Use http://10.0.2.2:<port> on the emulator. Bold item tag item',
      },
    ]);
  });

  it('returns nothing when there is no FAQ section', () => {
    expect(extractFaq('## What is MSW?\n\nA library.\n')).toEqual([]);
    expect(extractFaq(undefined)).toEqual([]);
  });
});

describe('markdownToPlainText', () => {
  it('keeps inline code text, including angle brackets', () => {
    expect(markdownToPlainText('Run `adb reverse tcp:<port>` and *then* `localhost`.')).toBe(
      'Run adb reverse tcp:<port> and then localhost.',
    );
  });
});

describe('buildFaqPageSchema', () => {
  it('emits schema.org Questions with accepted answers, or null when empty', () => {
    expect(buildFaqPageSchema([{ question: 'Q?', answer: 'A.' }])).toEqual({
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } }],
    });
    expect(buildFaqPageSchema([])).toBeNull();
  });
});
