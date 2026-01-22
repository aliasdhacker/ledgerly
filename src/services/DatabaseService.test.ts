import { DatabaseService } from '../DatabaseService';
import { Bill } from '../../types';

// Mock expo-sqlite
const mockExecuteSync = jest.fn();
const mockGetAllSync = jest.fn();
const mockRunSync = jest.fn();

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    prepareSync: jest.fn(() => ({
      executeSync: mockExecuteSync,
      finalizeSync: jest.fn(),
    })),
    getAllSync: mockGetAllSync,
    runSync: mockRunSync,
  })),
}));

describe('DatabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds a bill with correct parameters', () => {
    const newBill: Bill = {
      id: 'uuid-123',
      name: 'Internet',
      amount: 60,
      dueDay: 15,
      isPaid: false,
      syncStatus: 'dirty',
    };

    DatabaseService.addBill(newBill);

    expect(mockExecuteSync).toHaveBeenCalledWith({
      $id: 'uuid-123',
      $name: 'Internet',
      $amount: 60,
      $dueDay: 15,
      $isPaid: 0, // Boolean converted to number
      $syncStatus: 'dirty',
    });
  });

  it('maps SQL results to Bill objects correctly', () => {
    // Mock raw SQL return (snake_case)
    mockGetAllSync.mockReturnValue([
      { id: '1', name: 'Test', amount: 10, due_day: 5, is_paid: 1, sync_status: 'synced' },
    ]);

    const result = DatabaseService.getBills();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({
      name: 'Test',
      dueDay: 5, // mapped from due_day
      isPaid: true, // mapped from 1
    }));
  });
});