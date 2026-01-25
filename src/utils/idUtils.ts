// UUID generation utility for DriftMoney

export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Generate prefixed IDs for different entity types
export const generateId = {
  account: () => `acc_${generateUUID().slice(0, 8)}`,
  transaction: () => `txn_${generateUUID().slice(0, 8)}`,
  payable: () => `pay_${generateUUID().slice(0, 8)}`,
  category: () => `cat_${generateUUID().slice(0, 8)}`,
  budget: () => `bud_${generateUUID().slice(0, 8)}`,
  goal: () => `gol_${generateUUID().slice(0, 8)}`,
  transfer: () => `tfr_${generateUUID().slice(0, 8)}`,
  split: () => `spl_${generateUUID().slice(0, 8)}`,
  import: () => `imp_${generateUUID().slice(0, 8)}`,
};
