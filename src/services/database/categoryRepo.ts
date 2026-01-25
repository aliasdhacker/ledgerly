// Category repository

import { Category, CategoryCreate, CategoryUpdate } from '../../types';
import { queryAll, queryOne, execute, now, softDelete, getDirty, markManySynced } from './baseRepo';
import { generateId } from '../../utils';
import { DEFAULT_CATEGORIES } from '../../constants';

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_system: number;
  sort_order: number;
  parent_category_id: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

const rowToCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  color: row.color,
  isSystem: !!row.is_system,
  sortOrder: row.sort_order,
  parentCategoryId: row.parent_category_id || undefined,
  syncStatus: row.sync_status as 'synced' | 'dirty' | 'deleted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const categoryRepo = {
  // Initialize default categories
  initDefaults: (): void => {
    const existing = queryAll<{ id: string }>('SELECT id FROM categories WHERE is_system = 1');
    if (existing.length > 0) return; // Already initialized

    const timestamp = now();
    for (const cat of DEFAULT_CATEGORIES) {
      execute(
        `INSERT INTO categories (id, name, icon, color, is_system, sort_order, sync_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, 'dirty', ?, ?)`,
        [cat.id, cat.name, cat.icon, cat.color, cat.sortOrder, timestamp, timestamp]
      );
    }
  },

  // Get all categories
  getAll: (): Category[] => {
    const rows = queryAll<CategoryRow>(
      "SELECT * FROM categories WHERE sync_status != 'deleted' ORDER BY sort_order ASC"
    );
    return rows.map(rowToCategory);
  },

  // Get by ID
  getById: (id: string): Category | null => {
    const row = queryOne<CategoryRow>(
      "SELECT * FROM categories WHERE id = ? AND sync_status != 'deleted'",
      [id]
    );
    return row ? rowToCategory(row) : null;
  },

  // Get system categories
  getSystem: (): Category[] => {
    const rows = queryAll<CategoryRow>(
      "SELECT * FROM categories WHERE is_system = 1 AND sync_status != 'deleted' ORDER BY sort_order ASC"
    );
    return rows.map(rowToCategory);
  },

  // Get custom categories
  getCustom: (): Category[] => {
    const rows = queryAll<CategoryRow>(
      "SELECT * FROM categories WHERE is_system = 0 AND sync_status != 'deleted' ORDER BY sort_order ASC"
    );
    return rows.map(rowToCategory);
  },

  // Create category
  create: (data: CategoryCreate): Category => {
    const id = data.id || generateId.category();
    const timestamp = now();

    execute(
      `INSERT INTO categories (id, name, icon, color, is_system, sort_order, parent_category_id, sync_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, 'dirty', ?, ?)`,
      [id, data.name, data.icon, data.color, data.sortOrder, data.parentCategoryId || null, timestamp, timestamp]
    );

    return categoryRepo.getById(id)!;
  },

  // Update category
  update: (id: string, data: CategoryUpdate): Category | null => {
    const existing = categoryRepo.getById(id);
    if (!existing) return null;

    // Don't allow updating system categories (except sort order)
    if (existing.isSystem && (data.name || data.icon || data.color)) {
      throw new Error('Cannot modify system category properties');
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      params.push(data.icon);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      params.push(data.color);
    }
    if (data.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      params.push(data.sortOrder);
    }
    if (data.parentCategoryId !== undefined) {
      updates.push('parent_category_id = ?');
      params.push(data.parentCategoryId || null);
    }

    if (updates.length === 0) return existing;

    updates.push('sync_status = ?', 'updated_at = ?');
    params.push('dirty', now(), id);

    execute(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return categoryRepo.getById(id);
  },

  // Delete category (soft delete, only custom categories)
  delete: (id: string): boolean => {
    const existing = categoryRepo.getById(id);
    if (!existing || existing.isSystem) return false;

    softDelete('categories', id);
    return true;
  },

  // Get dirty records for sync
  getDirty: (): Category[] => {
    const rows = getDirty<CategoryRow>('categories');
    return rows.map(rowToCategory);
  },

  // Mark as synced
  markSynced: (ids: string[]): void => {
    markManySynced('categories', ids);
  },

  // Upsert from cloud
  upsertFromCloud: (category: Category): void => {
    const existing = queryOne<{ updated_at: string }>(
      'SELECT updated_at FROM categories WHERE id = ?',
      [category.id]
    );

    if (existing) {
      if (category.updatedAt > existing.updated_at) {
        execute(
          `UPDATE categories SET name = ?, icon = ?, color = ?, is_system = ?, sort_order = ?, 
           parent_category_id = ?, sync_status = 'synced', updated_at = ? WHERE id = ?`,
          [category.name, category.icon, category.color, category.isSystem ? 1 : 0,
           category.sortOrder, category.parentCategoryId || null, category.updatedAt, category.id]
        );
      }
    } else {
      execute(
        `INSERT INTO categories (id, name, icon, color, is_system, sort_order, parent_category_id, sync_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
        [category.id, category.name, category.icon, category.color, category.isSystem ? 1 : 0,
         category.sortOrder, category.parentCategoryId || null, category.createdAt, category.updatedAt]
      );
    }
  },
};
