import * as SQLite from 'expo-sqlite';

let db = null;

export async function getDB() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('studyvault.db');
  }
  return db;
}
