// Database module for DriftMoney
export { getDb, resetDb, DB_NAME, DB_VERSION } from './connection';
export { SCHEMA_V2, DROP_ALL_TABLES } from './schema';
export {
  snakeToCamel,
  camelToSnake,
  rowToEntity,
  entityToRow,
  now,
  safeJsonParse,
  buildInsert,
  buildUpdate,
  queryAll,
  queryOne,
  execute,
  withTransaction,
  softDelete,
  hardDelete,
  findBySyncStatus,
  markSynced,
  getSetting,
  setSetting,
  deleteAllData,
} from './helpers';
export type { ExecuteResult } from './helpers';
export { initializeDatabase, runMigrations, getCurrentVersion } from './migrations';
export { migrateLegacyData, hasLegacyData } from './migrateLegacy';
