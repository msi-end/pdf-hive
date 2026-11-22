import { getDB } from "./database";

export const initDatabase = async () => {
  const db = await getDB();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      isMarked INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      path TEXT NOT NULL,
      size INTEGER DEFAULT 0,    
      folderId INTEGER NOT NULL,
      isFavorite INTEGER DEFAULT 0,
      isMarked INTEGER DEFAULT 0,
      lastOpenedPage INTEGER,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (folderId) REFERENCES folders(id)
    );
  `);
};
