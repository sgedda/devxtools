---
title: "Realistic Test Data with Faker.js and Factories (TypeScript)"
description: "Generate realistic, deterministic test data in TypeScript with Faker.js and Fishery factories: seeding, traits, associations, MSW mocks and DB seeds."
slug: "/guides/faker-js-test-data-factories/"
canonical: "https://devxtools.dev/guides/faker-js-test-data-factories/"
replaces: "/guides/realistic-test-data-faker-factories/ (noindexed stub; 301 to this URL)"
h1: "Realistic Test Data with Faker.js and Factories"
primary_keyword: "faker js test data"
breadcrumbs: [{ name: "Home", url: "/" }, { name: "Guides", url: "/guides/" }, { name: "Faker.js Test Data and Factories", url: "/guides/faker-js-test-data-factories/" }]
schema: ["TechArticle", "BreadcrumbList", "FAQPage"]
author: "DevX Tools"
datePublished: "2026-10-15"
dateModified: "2026-10-15"
tested_with: "@faker-js/faker 10.6.0, fishery 2.4.0, chance 1.1.13, @ngneat/falso 8.0.2, msw 3.0.3, Vitest 5.0.5, TypeScript 7.0.2 via tsx 4.23.15, esbuild 0.28.2, Node 22.23.3 (node:sqlite); 2026-10-15"
tools: ["faker", "fishery", "chance", "mockaroo", "msw", "json-server"]
---

# Realistic Test Data with Faker.js and Factories

**Faker.js test data gives you realistic names, emails, prices and dates in seconds, but on its own it also gives you flaky tests.** This guide shows the setup that holds up in a real TypeScript codebase: Faker.js for values, seeded so they're the same on every run, wrapped in typed Fishery factories you reuse in unit tests, MSW handlers, Storybook stories and database seed scripts.

> **Tested with** @faker-js/faker 10.6.0, fishery 2.4.0, chance 1.1.13, @ngneat/falso 8.0.2, MSW 3.0.3 and Vitest 5.0.5 on Node 22.23.3 (2026-10-15). Every snippet except the Storybook one ran on our test machine, and the outputs shown are real. devxtools.dev is independent and has no relationship with Faker.js, Fishery, Chance, Falso or Mockaroo.

## TL;DR

Use **Faker.js** to generate realistic values and wrap it in typed **Fishery** factories, so every test builds a valid object and overrides only the fields it cares about. **Seed Faker** (`faker.seed()`) and set a reference date (`faker.setDefaultRefDate()`) so the "random" data is the same on every run and tests don't flake.

| | Faker.js | Chance | Falso | Fishery | Mockaroo |
|---|---|---|---|---|---|
| Type | Data generator | Data generator | Data generator | Factory library | Web/API generator |
| TypeScript | Built in | Types via DefinitelyTyped (`@types/chance`) | Built in | Built in | n/a |
| Seeding | `faker.seed()` | `new Chance(seed)` | `seed()` | Uses your generator | n/a |
| Locales | 70+ | English-centric (a few functions take a `nationality`) | 11 locale folders | n/a | Many |
| Best for | Realistic values | Lightweight random | Tree-shakable | Typed test objects | CSV/SQL datasets |
| Weekly npm downloads (Oct 2026) | ~17.9M | ~2.9M | ~469K | ~1.0M | n/a |

## Why hand-written fixtures rot, and why random data alone isn't the fix

Hand-written fixtures (`const user = { id: 1, name: 'Test', email: 'a@b.c' }`) start fine and then rot. Every new required field means editing dozens of files. Tests pass with data no real user would ever have. And copy-pasted objects hide which field a test actually depends on.

Swapping in random data fixes realism but adds a new problem: **non-determinism**. A test that passes 99 times and fails once, because Faker generated a name with an apostrophe or a date across a month boundary, is worse than no test. The answer is both: realistic values, **seeded** so they're reproducible, built through **factories** so each test states only what matters to it.

## Faker.js in 5 minutes

Faker.js lives on npm as **`@faker-js/faker`** (MIT; 10.6.0 is current, published August 2026). Its modules cover people, internet, commerce, location, dates, finance, strings and more:

```ts
import { faker, fakerDE } from '@faker-js/faker';

faker.seed(42);
fakerDE.seed(42);
faker.person.fullName();                                  // 'Nikita Crist'
faker.internet.email();                                   // 'Moises.Sipes-Effertz18@gmail.com'
faker.commerce.price({ min: 5, max: 50, symbol: '€' });   // '€28.69'
faker.location.city();                                    // 'Hilllport'
fakerDE.person.fullName();                                // 'Melinda Dragu'
faker.helpers.arrayElement(['free', 'pro', 'team']);      // 'team'
faker.helpers.multiple(() => faker.string.uuid(), { count: 2 });
```

Those comments are the actual output from our run with seed 42 (faker 10.6.0). `fakerDE` has its own generator, so it needs its own `fakerDE.seed(42)`. Locale-specific instances (`fakerDE`, `fakerFR`, `fakerJA` and so on) are separate named exports. The package ships 77 entries in `allLocales`. v10 requires Node `^20.19 || ^22.13 || ^23.5 || >=24` (from its `engines` field).

**On the name:** search for "Faker.js" or `@faker-js/faker`. The old unscoped `faker` package is not the maintained one (see the FAQ).

## Make it deterministic: seeds and reference dates

Two things make Faker output vary between runs: the random seed and "now".

```ts
import { beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';

beforeEach(() => {
  faker.seed(123);                                         // same values every run
  faker.setDefaultRefDate('2026-01-01T00:00:00.000Z');     // same "now" for faker.date.*
});
```

- **Seed per test, not per file.** With one seed at the top of a file, adding a test earlier in the file changes the data every later test receives. Seeding in `beforeEach` isolates them.
- **Relative dates need a reference date.** `faker.date.past()` and `faker.date.soon()` are relative to now, so a seed alone isn't enough. With the reference date above, our run produced `past: 2025-10-14T14:08:28.334Z` and `soon: 2026-01-02T09:32:43.503Z` every time.
- **Upgrades can change seeded values.** Faker's docs warn that a new version can return different values for the same seed because the underlying data lists change. Don't hard-code generated strings in assertions. Assert on shape or override the field.
- **Want a different seed on CI to find edge cases?** Use a random seed, log it, and allow it to be overridden by an environment variable, so a failing run can be reproduced exactly.

## Typed factories with Fishery

[Fishery](/tools/fishery/) (by thoughtbot, MIT, 2.4.0) turns "make me a valid User" into one call, with full TypeScript inference. It doesn't generate values itself. You use Faker.js inside it.

### define, build and buildList

```ts
// src/factories.ts
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'member' | 'admin';
  createdAt: Date;
}

class UserFactory extends Factory<User, { domain: string }> {
  admin() {
    return this.params({ role: 'admin' });               // a "trait"
  }
}

export const userFactory = UserFactory.define(({ sequence, transientParams, onCreate }) => {
  onCreate(async (user) => {
    // e.g. return db.user.create({ data: user })
    return { ...user, persisted: true } as User;
  });
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    id: sequence,
    name: `${firstName} ${lastName}`,
    email: faker.internet.email({ firstName, lastName, provider: transientParams.domain ?? 'example.com' }),
    role: 'member',
    createdAt: faker.date.past({ years: 1 }),
  };
});
```

```ts
userFactory.build();                       // a complete, valid User
userFactory.build({ name: 'Ada Lovelace' }); // override only what the test cares about
userFactory.buildList(3);                  // three users
```

`build()` returns a fully typed `User`, so a typo in an override is a compile error.

### Sequences

`sequence` increments on every build, which is handy for ids and guaranteed-unique values. Two things we hit in testing:

- **The sequence keeps counting across tests.** Call `userFactory.rewindSequence()` in `beforeEach` if ids matter.
- **Derived factories share it.** After building one `userFactory.admin()` user and one user with transient params, `userFactory.buildList(3)` returned ids `[3, 4, 5]`, not `[1, 2, 3]`.

### Traits via params

Fishery has no separate "trait" keyword. You add methods on a `Factory` subclass that return `this.params(...)` (or `this.transient(...)`/`this.associations(...)`), and you can chain them: `userFactory.admin().build()`.

### Associations

```ts
export const postFactory = Factory.define<Post>(({ sequence, associations }) => ({
  id: sequence,
  title: faker.lorem.sentence({ min: 3, max: 6 }),
  author: associations.author ?? userFactory.build(),
  tags: faker.helpers.arrayElements(['react', 'node', 'testing', 'typescript'], { min: 1, max: 2 }),
}));

const author = userFactory.admin().build();
postFactory.build({}, { associations: { author } }).author.role; // 'admin'
```

Using `associations.author ?? userFactory.build()` means a test can pass a specific author, or get a valid default.

### Transient params and onCreate

Transient params influence the build but don't appear on the object: `userFactory.build({}, { transient: { domain: 'acme.test' } })` produced an `@acme.test` email in our test. `onCreate` hooks run only for `create()`/`createList()` (which return Promises). That's where you persist to a database or call an API. `build()` stays pure and synchronous.

All five factory tests (overrides, determinism, traits/transient/lists, associations, `onCreate`) passed under Vitest 5.0.5.

## Using factories everywhere

The payoff is one source of truth for "what valid data looks like", used across the whole stack.

### Unit tests (Vitest or Jest)

```ts
import { beforeEach, expect, it } from 'vitest';
import { faker } from '@faker-js/faker';
import { userFactory } from '../src/factories';

beforeEach(() => {
  faker.seed(123);
  faker.setDefaultRefDate('2026-01-01T00:00:00.000Z');
  userFactory.rewindSequence();
});

it('is deterministic with a seed', () => {
  const a = userFactory.build();
  faker.seed(123);
  userFactory.rewindSequence();
  expect(userFactory.build()).toEqual(a);
});
```

Jest works identically. Swap the imports for Jest globals.

### MSW handlers that return factory data

[MSW](/tools/msw/) handlers can return factory-built data, so your mocked API looks like production data and respects query parameters:

```ts
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { userFactory } from '../src/factories';

const server = setupServer(
  http.get('https://api.example.com/users', ({ request }) => {
    const count = Number(new URL(request.url).searchParams.get('limit') ?? 5);
    return HttpResponse.json(userFactory.buildList(count));
  }),
);
```

This passed with MSW 3.0.3 (`fetch('…/users?limit=3')` returned three users). The same handlers work in the browser via `setupWorker` for local development and Storybook. Note that MSW 3 is ESM-only and needs Node 22.12+.

### Storybook stories

```tsx
// UserCard.stories.tsx (not run for this page; standard CSF3 args)
import type { Meta, StoryObj } from '@storybook/react';
import { faker } from '@faker-js/faker';
import { userFactory } from '../src/factories';
import { UserCard } from './UserCard';

faker.seed(7); // stable visuals for visual-regression snapshots

export default { component: UserCard } satisfies Meta<typeof UserCard>;
type Story = StoryObj<typeof UserCard>;

export const Member: Story = { args: { user: userFactory.build() } };
export const Admin: Story = { args: { user: userFactory.admin().build() } };
export const LongName: Story = { args: { user: userFactory.build({ name: 'Maximiliana Wolfeschlegelsteinhausen-Bergerdorff' }) } };
```

We didn't run Storybook for this page. The pattern is plain CSF `args`. Seeding matters even more here, because visual-regression tools flag any change in generated text.

### Seeding a dev database

The same factories make a reproducible dev database. This script ran with Node 22's built-in `node:sqlite`. The pattern is identical with a Prisma or Drizzle client in place of the raw SQL:

```ts
// scripts/seed.ts
import { DatabaseSync } from 'node:sqlite';
import { faker } from '@faker-js/faker';
import { userFactory } from '../src/factories';

faker.seed(2026); // everyone on the team gets the same dev data

const db = new DatabaseSync('dev.db');
db.exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, role TEXT, created_at TEXT)');
const insert = db.prepare('INSERT OR REPLACE INTO users VALUES (?, ?, ?, ?, ?)');

const users = [...userFactory.admin().buildList(2), ...userFactory.buildList(48)];
for (const u of users) insert.run(u.id, u.name, u.email, u.role, u.createdAt.toISOString());
```

Output: 2 admins and 48 members. For a mock REST API rather than a database, write the same factory output to a JSON file and serve it with [json-server](/tools/json-server/).

## Faker.js vs Chance vs Falso vs Mockaroo

| | Faker.js | Chance | Falso | Mockaroo |
|---|---|---|---|---|
| Package / form | `@faker-js/faker` 10.6.0 | `chance` 1.1.13 | `@ngneat/falso` 8.0.2 | Web app + REST API |
| API style | `faker.person.fullName()` | `chance.name()` | `randFullName()` (one function per value) | Schema builder in the browser |
| Seeding | `faker.seed(42)` | `new Chance(42)` | `seed('42')` | n/a |
| Latest release | 10.6.0, Aug 2026 | 1.1.13, May 2025 | 8.0.2, July 2025 (original GitHub repo returned 404 on 2026-10-15) | n/a |
| Browser bundle, one name call (esbuild, minified + gzip, our measurement) | ~153 KB | ~81 KB | ~13 KB | n/a |
| Free tier | Free (MIT) | Free (MIT) | Free (MIT) | 1,000 rows per file, 200 API requests/day; Silver $60/yr, Gold $500/yr |

**When to use which:**

- **Faker.js** is the default: broadest data, most locales, most active maintenance.
- **Falso** fits when generated data must ship in a **browser bundle** (demo modes, prototypes). One import cost about 13 KB gzipped in our build versus about 153 KB for Faker.js. Check its maintenance status first: the last release is 8.0.2 (July 2025), and its GitHub repository (github.com/ngneat/falso) returned 404 when we checked on 2026-10-15. The npm package still installs and works (seeding and `randFullName()` behaved as expected).
- **Chance** works if you mostly need random primitives (numbers, booleans, strings, dice) with a small API. Its last release was May 2025.
- **[Mockaroo](/tools/mockaroo/)** is for non-developers or one-off datasets: design a schema in the browser and download CSV, JSON or SQL. It's useful for spreadsheets and load-test data, but it doesn't replace in-code factories.

See also our tool pages for [Faker](/tools/faker/) and [Chance](/tools/chance/).

## Common pitfalls

- **Uniqueness.** `faker.helpers.unique()` no longer exists in v10 (we checked: it's `undefined`). For a set of unique values use `faker.helpers.uniqueArray(faker.internet.email, 3)`. For guaranteed-unique ids or emails across a test run, use Fishery's `sequence` (`user${sequence}@example.com`). Random emails can collide with a `UNIQUE` constraint eventually.
- **Bundle size.** In our esbuild test, importing `faker` added about 444 KB minified (153 KB gzip) to a browser bundle. `fakerDE` was *larger* (529 KB, 189 KB gzip) because it includes English as a fallback. Keep Faker in `devDependencies` and out of production code paths, or use Falso where it must ship.
- **Timezones.** Faker returns `Date` objects. Compare `toISOString()` values, run CI with `TZ=UTC`, and set a reference date. Otherwise "yesterday" tests break around midnight.
- **Snapshot tests.** Seeded data is stable until you upgrade Faker. Snapshot *structure*, or override the fields that appear in snapshots with fixed values, so a dependency bump doesn't rewrite 200 snapshots.
- **Over-specified factories.** If every test overrides five fields, the factory's defaults are wrong. Defaults should describe the most common valid object, and tests should override the one thing they test.
- **Relying on edge cases by luck.** Random data rarely hits empty strings, Unicode or maximum lengths. Write explicit tests for those (`userFactory.build({ name: '' })`), or use a property-based tool when you need systematic coverage.

## FAQ

### What is Faker.js used for?
Faker.js generates realistic fake data, such as names, emails, addresses, prices, dates, UUIDs and lorem text, for tests, mock APIs, demos, Storybook stories and seeding development databases. Install it as `@faker-js/faker`.

### How do I make Faker.js deterministic?
Call `faker.seed(123)` before generating data, ideally in `beforeEach` so each test is isolated, and call `faker.setDefaultRefDate('2026-01-01T00:00:00.000Z')` so relative dates don't depend on today. The same seed gives the same values on the same Faker version. Upgrades can change them.

### Faker.js vs Chance: which should I use?
Faker.js for realistic, locale-aware domain data (people, commerce, internet, locations) and active maintenance. Chance for a smaller API focused on random primitives. Both are MIT and seedable. If bundle size matters in the browser, Falso is tree-shakable, but check its maintenance status first.

### What is a test data factory?
A function that builds a complete, valid object with sensible defaults, so each test overrides only the fields it cares about. Fishery is a typed factory library for TypeScript with `build`, `buildList`, sequences, traits, associations, transient params and `onCreate` hooks. You use Faker.js inside it to generate values.

### Is Faker.js still maintained?
Yes, as `@faker-js/faker`. In January 2022 the original maintainer deliberately sabotaged the `faker` package and abandoned the project. A group of users forked it, republished all previous versions under `@faker-js/faker` and announced a community-maintained project on 14 January 2022. Version 10.6.0 was published in August 2026, and the GitHub repo was active on 2026-10-15.

### Can I use Faker.js with MSW?
Yes. Call your factories inside MSW handlers (`HttpResponse.json(userFactory.buildList(5))`) so mocked responses look like real data. Seed Faker in your test setup so the handler output is deterministic.

## Related

- [Faker](/tools/faker/) · [Fishery](/tools/fishery/) · [Chance](/tools/chance/) · [Mockaroo](/tools/mockaroo/)
- [MSW](/tools/msw/) · [json-server](/tools/json-server/)
- [Mocking & test data hub](/mocking-test-data/)

## Sources

All accessed 2026-10-15.

- Faker.js usage guide (seeding, reference dates, upgrade caveat): https://fakerjs.dev/guide/usage.html
- Faker.js API reference: https://fakerjs.dev/api/
- "An update from the Faker team" (14 January 2022): https://fakerjs.dev/about/announcements/2022-01-14
- Sonatype, "Faker npm Library Gets New Home After Dev Quits" (January 2022): https://www.sonatype.com/blog/faker-npm-library-gets-new-home
- @faker-js/faker on npm (version, engines, licence): https://www.npmjs.com/package/@faker-js/faker
- Fishery README: https://github.com/thoughtbot/fishery
- Chance.js: https://chancejs.com/; npm: https://www.npmjs.com/package/chance
- @ngneat/falso on npm (8.0.2, published 2025-07-13): https://www.npmjs.com/package/@ngneat/falso (the linked GitHub repo, github.com/ngneat/falso, returned 404 on 2026-10-15)
- Mockaroo pricing: https://www.mockaroo.com/pricing
- MSW docs: https://mswjs.io/docs/
- Node.js `node:sqlite`: https://nodejs.org/api/sqlite.html
- npm downloads API (week of Oct 6–12, 2026) for @faker-js/faker, chance, @ngneat/falso, fishery
