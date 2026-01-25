// Database module for DriftMoney
export { getDb, resetDb, DB_NAME, DB_VERSION } from './connection';
export { SCHEMA_V2, DROP_ALL_TABLES } from './schema';
export {
  snakeToCamel,
  camelToSnake,
  rowToEntity,
  entityToRow,
  now,
  buildInsert,
  buildUpdate,
  queryAll,
  queryOne,
  execute,
  softDelete,
  hardDelete,
  findBySyncStatus,
  markSynced,
  getSetting,
  setSetting,
} from './helpers';
export { initializeDatabase, runMigrations, getCurrentVersion } from './migrations';
export { migrateLegacyData, hasLegacyData } from './migrateLegacy';
