// Convert final markdown to .astro with SEO fixes applied
const fs = require('fs');
const path = require('path');

// SEO fixes to apply
const seoFixes = {
  'postman-alternatives': {
    // Add tool links, fix ItemList, add "desktop app only", remove TODO
    fixes: [
      'Add /tools/yaak/, /tools/thunder-client/, /tools/apidog/ links',
      'ItemList uses devxtools.dev URLs for yaak, thunder-client, apidog',
      'Add "desktop app only" to Native Git mentions',
      'Remove Yaak "CI use: TODO"',
      'Strip all TODO comments'
    ]
  },
  'bruno-vs-postman': {
    title: 'Bruno vs Postman (2026): Which API Client Fits Your Team?',
    meta: 'Bruno vs Postman in 2026: both store YAML in Git now. We compare accounts, CI runners, reports, mock servers, security and pricing.',
    fixes: [
      'Update title to ≤60 chars matching accounts/CI angle',
      'Add "desktop app only" to Native Git',
      'Put "Bruno vs Postman" in first body sentence',
      'Strip all TODO comments'
    ]
  },
  'playwright-vs-cypress': {
    title: 'Playwright vs Cypress (2026): Speed, Mocking & CI Cost',
    fixes: [
      'Update title to ≤60 chars',
      'Add Starter 500-result caveat (parallelization off after 500)',
      'Add FAQ "Is Playwright better than Cypress?"',
      'Strip all TODO comments'
    ]
  },
  'mock-api-playwright': {
    meta: 'Mock API requests in Playwright: page.route and route.fulfill, modifying real responses, POST and query params, HAR replay, MSW, and troubleshooting.',
    fixes: [
      'Update meta to ≤155 chars',
      'Put "mock APIs in Playwright" in first sentence',
      'Strip all TODO comments'
    ]
  }
};

console.log('SEO Fixes to apply:');
console.log(JSON.stringify(seoFixes, null, 2));
console.log('\nThese fixes will be applied during manual conversion.');
