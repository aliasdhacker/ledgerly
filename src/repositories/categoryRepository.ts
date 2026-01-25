// Category repository for DriftMoney
import {
  queryAll,
  queryOne,
  execute,
  buildInsert,
  buildUpdate,
  entityToRow,
  softDelete,
  markSynced,
  findBySyncStatus,
  now,
} from '../db';
import { generateId } from '../utils/idUtils';
import { DEFAULT_CATEGORIES } from '../constants/categories';
import type { Category, CategoryCreate, CategoryUpdate } from '../types/category';
import type { SyncStatus } from '../types/common';

export const CategoryRepository = {
  findById(id: string): Category | null {
    return queryOne<Category>(
      'SELECT * FROM categories WHERE id = ? AND sync_status != ?',
      [id, 'deleted']
    );
  },

  findAll(): Category[] {
    return queryAll<Category>(
      'SELECT * FROM categories WHERE sync_status != ? ORDER BY sort_order ASC, name ASC',
      ['deleted']
    );
  },

  findByParent(parentCategoryId: string | null): Category[] {
    if (parentCategoryId === null) {
      return queryAll<Category>(
        'SELECT * FROM categories WHERE parent_category_id IS NULL AND sync_status != ? ORDER BY sort_order ASC',
        ['deleted']
      );
    }
    return queryAll<Category>(
      'SELECT * FROM categories WHERE parent_category_id = ? AND sync_status != ? ORDER BY sort_order ASC',
      [parentCategoryId, 'deleted']
    );
  },

  findSystemCategories(): Category[] {
    return queryAll<Category>(
      'SELECT * FROM categories WHERE is_system = 1 AND sync_status != ? ORDER BY sort_order ASC',
      ['deleted']
    );
  },

  findUserCategories(): Category[] {
    return queryAll<Category>(
      'SELECT * FROM categories WHERE is_system = 0 AND sync_status != ? ORDER BY sort_order ASC',
      ['deleted']
    );
  },

  create(data: CategoryCreate): Category {
    const timestamp = now();
    const category: Category = {
      id: data.id || generateId.category(),
      name: data.name,
      icon: data.icon,
      color: data.color,
      isSystem: false,
      sortOrder: data.sortOrder,
      parentCategoryId: data.parentCategoryId,
      syncStatus: 'dirty',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const row = entityToRow(category);
    const { sql, params } = buildInsert('categories', row);
    execute(sql, params);

    return category;
  },

  update(id: string, data: CategoryUpdate): Category | null {
    const existing = this.findById(id);
    if (!existing) return null;

    // Don't allow updating system categories
    if (existing.isSystem) return existing;

    const timestamp = now();
    const updateData = {
      ...data,
      syncStatus: 'dirty' as SyncStatus,
      updatedAt: timestamp,
    };

    const row = entityToRow(updateData, ['id', 'createdAt', 'isSystem']);
    const { sql, params } = buildUpdate('categories', row, 'id = ?', [id]);
    execute(sql, params);

    return this.findById(id);
  },

  delete(id: string): boolean {
    const existing = this.findById(id);
    if (!existing || existing.isSystem) return false;

    softDelete('categories', id);
    return true;
  },

  /**
   * Seeds the database with default system categories.
   * Only creates categories that don't already exist.
   */
  seedSystemCategories(): void {
    const timestamp = now();

    for (const cat of DEFAULT_CATEGORIES) {
      const existing = queryOne<Category>(
        'SELECT id FROM categories WHERE id = ?',
        [cat.id]
      );

      if (!existing) {
        const category: Category = {
          ...cat,
          syncStatus: 'dirty',
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        const row = entityToRow(category);
        const { sql, params } = buildInsert('categories', row);
        execute(sql, params);
      }
    }
  },

  // Sync helpers
  findDirty(): Category[] {
    return findBySyncStatus<Category>('categories', 'dirty');
  },

  markSynced(ids: string[]): void {
    markSynced('categories', ids);
  },

  upsertFromCloud(category: Category & { updatedAt: string }): void {
    const existing = queryOne<Category & { updatedAt: string }>(
      'SELECT * FROM categories WHERE id = ?',
      [category.id]
    );

    if (existing) {
      if (category.updatedAt > existing.updatedAt) {
        const row = entityToRow(
          { ...category, syncStatus: 'synced' as SyncStatus },
          ['id', 'createdAt']
        );
        const { sql, params } = buildUpdate('categories', row, 'id = ?', [
          category.id,
        ]);
        execute(sql, params);
      }
    } else {
      const row = entityToRow({ ...category, syncStatus: 'synced' as SyncStatus });
      const { sql, params } = buildInsert('categories', row);
      execute(sql, params);
    }
  },
};
