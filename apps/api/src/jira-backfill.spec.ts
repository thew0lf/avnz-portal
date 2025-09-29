import { backfillInProgress } from './jira-backfill';
import { pool } from './db.js';

jest.mock('./db.js');

describe('Jira Backfill Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a Jira group and add users', async () => {
    // Mock necessary functions and responses
    pool.connect = jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [{ id: 'orgId' }] })
    });

    const result = await backfillInProgress();
    expect(result.ok).toBe(true);
  });
});