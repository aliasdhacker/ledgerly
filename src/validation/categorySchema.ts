// Category validation schemas

import { CategoryCreate, CategoryUpdate } from '../types';
import { createValidator, validators } from './validator';

const { required, string, boolean, minLength, maxLength, min } = validators;

export const validateCategoryCreate = createValidator<CategoryCreate>({
  name: [required, string, minLength(1), maxLength(50)],
  icon: [required, string, maxLength(10)],
  color: [required, string, maxLength(10)],
  sortOrder: [required, min(0)],
  parentCategoryId: [string],
});

export const validateCategoryUpdate = createValidator<CategoryUpdate>({
  name: [string, minLength(1), maxLength(50)],
  icon: [string, maxLength(10)],
  color: [string, maxLength(10)],
  sortOrder: [min(0)],
  parentCategoryId: [string],
});
