// Category Service for DriftMoney
// Business logic for categories with system category seeding and inference

import { CategoryRepository } from '../../repositories';
import { validateCategoryCreate, validateCategoryUpdate } from '../../validation';
import { CATEGORY_KEYWORDS, CATEGORY_IDS } from '../../constants/categories';
import type { Category, CategoryCreate, CategoryUpdate } from '../../types/category';

export interface CategoryWithChildren extends Category {
  children: Category[];
}

export const CategoryService = {
  // CRUD Operations
  getById(id: string): Category | null {
    return CategoryRepository.findById(id);
  },

  getAll(): Category[] {
    return CategoryRepository.findAll();
  },

  getSystemCategories(): Category[] {
    return CategoryRepository.findSystemCategories();
  },

  getUserCategories(): Category[] {
    return CategoryRepository.findUserCategories();
  },

  getRootCategories(): Category[] {
    return CategoryRepository.findByParent(null);
  },

  getSubcategories(parentId: string): Category[] {
    return CategoryRepository.findByParent(parentId);
  },

  /**
   * Returns categories organized as a tree with children nested
   */
  getCategoryTree(): CategoryWithChildren[] {
    const allCategories = CategoryRepository.findAll();
    const rootCategories = allCategories.filter((c) => !c.parentCategoryId);

    return rootCategories.map((root) => ({
      ...root,
      children: allCategories.filter((c) => c.parentCategoryId === root.id),
    }));
  },

  create(data: CategoryCreate): { success: true; category: Category } | { success: false; errors: string[] } {
    const validation = validateCategoryCreate(data);
    if (!validation.success) {
      return { success: false, errors: Object.values(validation.errors) };
    }

    // Check for duplicate name
    const existing = CategoryRepository.findAll().find(
      (c) => c.name.toLowerCase() === data.name.toLowerCase()
    );
    if (existing) {
      return { success: false, errors: ['A category with this name already exists'] };
    }

    const category = CategoryRepository.create(data);
    return { success: true, category };
  },

  update(id: string, data: CategoryUpdate): { success: true; category: Category } | { success: false; errors: string[] } {
    const existing = CategoryRepository.findById(id);
    if (!existing) {
      return { success: false, errors: ['Category not found'] };
    }

    if (existing.isSystem) {
      return { success: false, errors: ['Cannot modify system categories'] };
    }

    const validation = validateCategoryUpdate(data);
    if (!validation.success) {
      return { success: false, errors: Object.values(validation.errors) };
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = CategoryRepository.findAll().find(
        (c) => c.name.toLowerCase() === data.name!.toLowerCase() && c.id !== id
      );
      if (duplicate) {
        return { success: false, errors: ['A category with this name already exists'] };
      }
    }

    const category = CategoryRepository.update(id, data);
    if (!category) {
      return { success: false, errors: ['Failed to update category'] };
    }

    return { success: true, category };
  },

  delete(id: string): { success: true } | { success: false; errors: string[] } {
    const existing = CategoryRepository.findById(id);
    if (!existing) {
      return { success: false, errors: ['Category not found'] };
    }

    if (existing.isSystem) {
      return { success: false, errors: ['Cannot delete system categories'] };
    }

    // Check if category has children
    const children = CategoryRepository.findByParent(id);
    if (children.length > 0) {
      return { success: false, errors: ['Cannot delete a category with subcategories'] };
    }

    const deleted = CategoryRepository.delete(id);
    if (!deleted) {
      return { success: false, errors: ['Failed to delete category'] };
    }

    return { success: true };
  },

  // Seeding
  seedSystemCategories(): void {
    CategoryRepository.seedSystemCategories();
  },

  // Category Inference
  /**
   * Infers a category from description text (for OCR imports)
   * Returns the category ID or null if no match
   */
  inferFromDescription(description: string): string | null {
    const lowerDesc = description.toLowerCase();

    for (const [categoryId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerDesc.includes(keyword.toLowerCase())) {
          return categoryId;
        }
      }
    }

    return null;
  },

  /**
   * Infers a category with confidence score
   */
  inferWithConfidence(description: string): { categoryId: string | null; confidence: number; matchedKeyword?: string } {
    const lowerDesc = description.toLowerCase();
    let bestMatch: { categoryId: string; keyword: string; position: number } | null = null;

    for (const [categoryId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        const position = lowerDesc.indexOf(keyword.toLowerCase());
        if (position !== -1) {
          // Prefer matches earlier in the description and longer keywords
          if (
            !bestMatch ||
            keyword.length > bestMatch.keyword.length ||
            (keyword.length === bestMatch.keyword.length && position < bestMatch.position)
          ) {
            bestMatch = { categoryId, keyword, position };
          }
        }
      }
    }

    if (!bestMatch) {
      return { categoryId: null, confidence: 0 };
    }

    // Calculate confidence based on keyword length relative to description
    const confidence = Math.min(1, bestMatch.keyword.length / 10);

    return {
      categoryId: bestMatch.categoryId,
      confidence,
      matchedKeyword: bestMatch.keyword,
    };
  },

  // Sorting
  reorder(categoryIds: string[]): void {
    categoryIds.forEach((id, index) => {
      const category = CategoryRepository.findById(id);
      if (category && !category.isSystem) {
        CategoryRepository.update(id, { sortOrder: index });
      }
    });
  },

  // Constants access
  getDefaultCategoryIds(): typeof CATEGORY_IDS {
    return CATEGORY_IDS;
  },
};
