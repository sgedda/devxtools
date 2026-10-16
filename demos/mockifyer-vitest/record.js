// Record script for capturing fresh API responses
// Run with: npm run record

import { setupMockifyer } from '@sgedda/mockifyer-fetch';

setupMockifyer({
  mockDataPath: './mock-data',
  defaultScenario: 'default',
  recordMode: true,
});

async function recordTask() {
  console.log('Recording response from demo.devxtools.dev...');
  const response = await fetch('https://demo.devxtools.dev/tasks/1');
  const data = await response.json();
  
  console.log('Recorded:', data);
  console.log('Mock saved to mock-data/default/');
}

recordTask().catch(console.error);
