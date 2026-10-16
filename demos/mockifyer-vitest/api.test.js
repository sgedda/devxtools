import { describe, it, expect, beforeAll } from 'vitest';
import { setupMockifyer, getCurrentDate } from '@sgedda/mockifyer-fetch';

// Set up Mockifyer before tests run
beforeAll(() => {
  setupMockifyer({
    mockDataPath: './mock-data',
    defaultScenario: 'default',
    recordMode: false,
    dateManipulation: {
      fixedDate: '2026-10-16T21:30:00.000Z',
    },
  });
});

describe('Mockifyer fetch tests', () => {
  it('replays recorded HTTP response', async () => {
    const response = await fetch('https://demo.devxtools.dev/tasks/1');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data).toEqual({
      id: 1,
      title: 'Set up project repository',
      completed: true,
      userId: 1,
    });
  });

  it('returns fixed date from getCurrentDate', () => {
    const currentDate = getCurrentDate();
    expect(currentDate.toISOString()).toBe('2026-10-16T21:30:00.000Z');
  });
});
