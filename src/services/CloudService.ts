import { Bill } from '../types';

// This is the contract we will fulfill with Java/AWS later
interface ICloudService {
  syncBills(localBills: Bill[]): Promise<void>;
  uploadSnapshot(balance: number, safeToSpend: number): Promise<void>;
}

export const CloudService: ICloudService = {
  // STUB: Simulate a network call that does nothing
  syncBills: async (localBills) => {
    console.log('[Cloud Stub] Syncing bills... (Simulated)');
    return new Promise((resolve) => setTimeout(resolve, 1000));
  },

  // STUB: Simulate uploading the draft calculation
  uploadSnapshot: async (balance, safeToSpend) => {
    console.log(`[Cloud Stub] Uploading snapshot: Balance ${balance}, Safe ${safeToSpend}`);
    return Promise.resolve();
  }
};