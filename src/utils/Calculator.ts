// DEPRECATED: This file has been removed
// Safe-to-spend calculation moved to service layer
// This file exists only to prevent import errors during migration

export const calculateSafeToSpend = (): number => {
  console.warn('Calculator.ts is deprecated. Use service layer instead.');
  return 0;
};
