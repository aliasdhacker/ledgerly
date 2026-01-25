// General formatting utilities for DriftMoney

// Truncate text with ellipsis
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

// Capitalize first letter
export const capitalize = (text: string): string => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// Title case
export const titleCase = (text: string): string => {
  return text
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
};

// Format account number (show last 4)
export const formatAccountNumber = (last4?: string): string => {
  if (!last4) return '';
  return `••••${last4}`;
};

// Clean merchant name from transaction description
export const cleanMerchantName = (description: string): string => {
  // Remove common suffixes like transaction IDs, card numbers
  let cleaned = description
    .replace(/\s*#\d+\s*/g, '') // Remove #123456
    .replace(/\s*\d{4,}\s*/g, ' ') // Remove long numbers
    .replace(/\s*x{2,}\d+\s*/gi, '') // Remove xxxx1234
    .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
    .trim();

  // Title case if all caps
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 3) {
    cleaned = titleCase(cleaned);
  }

  return cleaned;
};

// Format ordinal number (1st, 2nd, 3rd, etc.)
export const formatOrdinal = (num: number): string => {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Pluralize word
export const pluralize = (count: number, singular: string, plural?: string): string => {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || singular + 's'}`;
};

// Generate initials from name
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
