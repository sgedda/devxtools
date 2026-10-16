// Record script - captures real API responses with Mockifyer
import { setupMockifyer } from '@sgedda/mockifyer-fetch';

setupMockifyer({
  mockDataPath: './mock-data',
  defaultScenario: 'default',
  recordMode: true,
  useGlobalFetch: true,
  domainPathRulesMode: 'record_all', // Allow recording without explicit allowlist
});

async function record() {
  console.log('Recording response from demo.devxtools.dev/tasks/1...');
  
  const response = await fetch('https://demo.devxtools.dev/tasks/1');
  const data = await response.json();
  
  console.log('Recorded data:', data);
  console.log('Mock should be saved to mock-data/default/');
}

record().catch(console.error);
