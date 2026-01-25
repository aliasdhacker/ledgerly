// Validation schemas for DriftMoney using Zod-like validation
// Lightweight custom validation to avoid adding Zod dependency

export interface ValidationResult {
  success: boolean;
  errors: Record<string, string>;
}

export type Validator<T> = (data: unknown) => ValidationResult & { data?: T };

// Helper functions
const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number' && !isNaN(v);
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// Date validation (YYYY-MM-DD)
const isValidDate = (v: unknown): boolean => {
  if (!isString(v)) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(v)) return false;
  const date = new Date(v);
  return !isNaN(date.getTime());
};

// Common field validators
export const validators = {
  required: (value: unknown, fieldName: string): string | null => {
    if (value === undefined || value === null || value === '') {
      return `${fieldName} is required`;
    }
    return null;
  },

  string: (value: unknown, fieldName: string): string | null => {
    if (value !== undefined && value !== null && !isString(value)) {
      return `${fieldName} must be a string`;
    }
    return null;
  },

  number: (value: unknown, fieldName: string): string | null => {
    if (value !== undefined && value !== null && !isNumber(value)) {
      return `${fieldName} must be a number`;
    }
    return null;
  },

  positiveNumber: (value: unknown, fieldName: string): string | null => {
    if (value !== undefined && value !== null) {
      if (!isNumber(value) || value < 0) {
        return `${fieldName} must be a positive number`;
      }
    }
    return null;
  },

  boolean: (value: unknown, fieldName: string): string | null => {
    if (value !== undefined && value !== null && !isBoolean(value)) {
      return `${fieldName} must be a boolean`;
    }
    return null;
  },

  date: (value: unknown, fieldName: string): string | null => {
    if (value !== undefined && value !== null && !isValidDate(value)) {
      return `${fieldName} must be a valid date (YYYY-MM-DD)`;
    }
    return null;
  },

  minLength: (min: number) => (value: unknown, fieldName: string): string | null => {
    if (isString(value) && value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max: number) => (value: unknown, fieldName: string): string | null => {
    if (isString(value) && value.length > max) {
      return `${fieldName} must be at most ${max} characters`;
    }
    return null;
  },

  oneOf: <T extends string>(options: readonly T[]) => (value: unknown, fieldName: string): string | null => {
    if (value !== undefined && value !== null && !options.includes(value as T)) {
      return `${fieldName} must be one of: ${options.join(', ')}`;
    }
    return null;
  },

  min: (min: number) => (value: unknown, fieldName: string): string | null => {
    if (isNumber(value) && value < min) {
      return `${fieldName} must be at least ${min}`;
    }
    return null;
  },

  max: (max: number) => (value: unknown, fieldName: string): string | null => {
    if (isNumber(value) && value > max) {
      return `${fieldName} must be at most ${max}`;
    }
    return null;
  },
};

// Create validator function
export const createValidator = <T>(
  schema: Record<string, ((value: unknown, fieldName: string) => string | null)[]>
): Validator<T> => {
  return (data: unknown): ValidationResult & { data?: T } => {
    const errors: Record<string, string> = {};

    if (!isObject(data)) {
      return { success: false, errors: { _root: 'Invalid data format' } };
    }

    for (const [field, fieldValidators] of Object.entries(schema)) {
      const value = data[field];
      for (const validate of fieldValidators) {
        const error = validate(value, field);
        if (error) {
          errors[field] = error;
          break;
        }
      }
    }

    const success = Object.keys(errors).length === 0;
    return success
      ? { success: true, errors: {}, data: data as T }
      : { success: false, errors };
  };
};
