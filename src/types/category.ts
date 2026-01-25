// Category types for DriftMoney

import { SyncableEntity } from './common';

export interface Category extends SyncableEntity {
  name: string;
  icon: string;
  color: string;
  isSystem: boolean;
  sortOrder: number;
  parentCategoryId?: string;
}

// For creating new categories
export type CategoryCreate = Omit<Category, keyof SyncableEntity | 'isSystem'> & {
  id?: string;
};

// For updating categories
export type CategoryUpdate = Partial<Omit<Category, 'id' | 'createdAt' | 'isSystem'>>;
