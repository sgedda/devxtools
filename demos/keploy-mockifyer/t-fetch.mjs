import { setupMockifyer } from '@sgedda/mockifyer-fetch';

const record = process.env.MOCKIFYER_RECORD === 'true';
const port = process.env.PORT || '4599';
setupMockifyer({
  mockDataPath: process.env.MD || './mock-data/fetch',
  useGlobalFetch: true,
  recordMode: record,
  domainPathRulesMode: 'record_all',
  logging: 'error',
});
const r = await (await fetch(`http://127.0.0.1:${port}/users/1`)).json();
console.log('RESULT fetch', record ? 'record' : 'replay', 'got version', r.version);
await new Promise((resolve) => setTimeout(resolve, 800));
