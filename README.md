# DevX Tools

> A curated guide to API mocking, testing, and test data generation tools for developers.

Visit [devxtools.dev](https://devxtools.dev) to explore the catalog.

## About

DevX Tools is a comprehensive, community-driven catalog of developer tools focused on:

- API mocking and HTTP interception
- Mock servers and service virtualization
- Contract testing
- Test data generation
- Record/replay functionality

All tools are cataloged with verified information, categorized by use case, and searchable by language, runtime, and spec support.

## Project Structure

```
/
├── src/
│   ├── data/
│   │   └── tools/          # YAML files for each tool
│   ├── layouts/
│   │   └── Layout.astro    # Base layout with SEO
│   ├── lib/
│   │   ├── schema.ts       # Zod schema for tool validation
│   │   └── tools.ts        # Tool loading utilities
│   └── pages/
│       ├── index.astro     # Home page
│       ├── catalog.astro   # Tool catalog with filters
│       ├── picker.astro    # Interactive tool picker
│       ├── changelog.astro # Site changelog
│       ├── tools/
│       │   └── [slug].astro    # Dynamic tool pages
│       ├── comparisons/
│       │   └── ...            # Tool comparisons
│       └── guides/
│           └── ...            # Tutorial guides
├── scripts/
│   └── validate-catalog.ts  # Schema validation script
└── public/
    └── robots.txt
```

## Adding a New Tool

### 1. Create a YAML file

Create a new file in `src/data/tools/` named after the tool's slug (e.g., `my-tool.yaml`).

```yaml
name: My Tool
slug: my-tool
website: https://example.com
repo: https://github.com/example/my-tool  # optional
license: MIT  # optional
languages:
  - TypeScript
  - JavaScript
runtimes:
  - Node.js
  - Browser
categories:
  - http-interception
  - mock-server
specSupport:  # optional
  - OpenAPI
  - GraphQL
bestFor: One-line description of the tool's sweet spot
description: A comprehensive description of what the tool does and how it works.
lastChecked: 2026-10-14  # YYYY-MM-DD format
```

### 2. Valid categories

- `http-interception`
- `mock-server`
- `spec-based-mocking`
- `contract-testing`
- `test-data-generation`
- `hosted-mocks`
- `record-replay`

### 3. Validate your changes

```bash
npm run validate
```

This will check all tool files against the schema.

### 4. Build and test locally

```bash
npm install
npm run dev
```

Visit `http://localhost:4321` to preview your changes.

### 5. Submit a pull request

- Verify URLs are correct and accessible
- Ensure license information is accurate
- Update `lastChecked` to the current date
- Run validation before committing

## Updating an Existing Tool

1. Edit the tool's YAML file in `src/data/tools/`
2. Update the `lastChecked` date to today
3. Run `npm run validate` to check for errors
4. Submit a pull request with your changes

## Development

### Prerequisites

- Node.js 22.12.0 or higher
- npm 10.9.0 or higher

### Commands

| Command                | Action                                     |
| :--------------------- | :----------------------------------------- |
| `npm install`          | Install dependencies                       |
| `npm run dev`          | Start dev server at `localhost:4321`       |
| `npm run build`        | Build production site to `./dist/`         |
| `npm run preview`      | Preview build locally before deploying     |
| `npm run validate`     | Validate all tool catalog entries          |

## Deployment

This site is designed to deploy as a static site to Cloudflare Pages or Vercel.

### Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set build output directory: `dist`
4. Deploy

### Vercel

1. Connect your GitHub repository to Vercel
2. Framework preset: Astro
3. Build command: `npm run build`
4. Output directory: `dist`
5. Deploy

## Continuous Integration

The repository includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that:

- Validates all tool catalog entries against the schema
- Builds the site
- Runs on every PR and push to main

## Contributing

We welcome contributions! Here's how you can help:

- **Add new tools**: Create a PR with a new tool YAML file
- **Update existing tools**: Keep information current (versions, URLs, features)
- **Write guides**: Expand stub guides with detailed tutorials
- **Report issues**: Found incorrect information? Open an issue
- **Improve comparisons**: Add new comparison pages or enhance existing ones

### Guidelines

- **Accuracy first**: All information must be verifiable
- **No marketing speak**: Be objective and factual
- **Keep it current**: Update `lastChecked` dates when verifying info
- **Test locally**: Always run `npm run validate` and preview changes
- **Write clear descriptions**: Help users understand when to use each tool

## Automated Updates

A weekly GitHub Action automatically:

1. Checks for broken links in tool websites and repos
2. Opens PRs to update `lastChecked` dates
3. Flags tools that may need review

## License

Content: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)  
Code: MIT

## Maintainers

- [@sgedda](https://github.com/sgedda)

## Acknowledgments

Built with [Astro](https://astro.build), styled with modern CSS, and hosted as a static site.

Special thanks to all the tool maintainers and contributors who make the developer experience better every day.
