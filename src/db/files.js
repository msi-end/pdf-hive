// /db/files.js
import * as FileSystem from "expo-file-system/legacy";
import { getDB } from "./database";

/**
 * Remove a stored file from device storage (links have nothing on disk).
 * Failures are logged but never block the DB delete.
 */
export const deleteFileFromDisk = async (file) => {
  if (!file || file.type === "link" || !file.path) return;
  try {
    await FileSystem.deleteAsync(file.path, { idempotent: true });
  } catch (e) {
    console.log("Failed to delete file from disk:", e);
  }
};

export const addFile = async ({
  name,
  type,
  path,
  folderId,
  isFavorite = 0,
  isMarked = 0,
  lastOpenedPage = null,
  size = 0,
}) => {
  const db = await getDB();
  const createdAt = Date.now();

  const result = await db.runAsync(
    `INSERT INTO files 
     (name, type, path, folderId, isFavorite, isMarked, lastOpenedPage, size, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      type,
      path,
      folderId,
      isFavorite,
      isMarked,
      lastOpenedPage,
      size,
      createdAt,
    ],
  );

  return result.lastInsertRowId;
};

export const getFilesByFolder = async (folderId) => {
  const db = await getDB();

  return await db.getAllAsync(
    `SELECT * FROM files
     WHERE folderId = ?
     ORDER BY createdAt DESC`,
    [folderId],
  );
};

export const deleteFile = async (fileId) => {
  const db = await getDB();

  const file = await db.getFirstAsync(`SELECT * FROM files WHERE id = ?`, [
    fileId,
  ]);
  await deleteFileFromDisk(file);

  await db.runAsync(`DELETE FROM files WHERE id = ?`, [fileId]);

  return true;
};

export const renameFile = async (fileId, newName) => {
  const db = await getDB();

  await db.runAsync(`UPDATE files SET name = ? WHERE id = ?`, [
    newName,
    fileId,
  ]);

  return true;
};

export const toggleFavorite = async (fileId, isFavorite) => {
  const db = await getDB();

  await db.runAsync(`UPDATE files SET isFavorite = ? WHERE id = ?`, [
    isFavorite ? 1 : 0,
    fileId,
  ]);

  return true;
};

export const toggleMarked = async (fileId, isMarked) => {
  const db = await getDB();
  await db.runAsync(`UPDATE files SET isMarked = ? WHERE id = ?`, [
    isMarked ? 1 : 0,
    fileId,
  ]);
  return true;
};

export const getMarkedFiles = async () => {
  const db = await getDB();

  return await db.getAllAsync(
    `SELECT * FROM files
     WHERE isMarked = 1
     ORDER BY createdAt DESC`,
  );
};

export const getFileById = async (fileId) => {
  if (!fileId) throw new Error("fileId is required");

  const db = await getDB();

  const file = await db.getFirstAsync(
    `SELECT * FROM files WHERE id = ? LIMIT 1`,
    [fileId],
  );

  return file || null;
};

export const searchFiles = async (
  query = "",
  type = "All",
  onlyFavorite = false,
  onlyMarked = false,
) => {
  const db = await getDB();

  let sql = `
    SELECT files.*, folders.name as folderName,
    CASE
      WHEN LOWER(files.name) = LOWER(?) THEN 1
      WHEN LOWER(files.name) LIKE LOWER(?) THEN 2
      ELSE 3
    END as rank
    FROM files
    LEFT JOIN folders ON files.folderId = folders.id
    WHERE files.name LIKE ?
  `;

  const params = [query, `${query}%`, `%${query}%`];

  if (type !== "All") {
    sql += ` AND files.type = ?`;
    params.push(type.toLowerCase().slice(0, -1));
  }

  if (onlyFavorite) {
    sql += ` AND files.isFavorite = 1`;
  }

  if (onlyMarked) {
    sql += ` AND files.isMarked = 1`;
  }

  sql += ` ORDER BY rank ASC, files.createdAt DESC`;

  const result = await db.getAllAsync(sql, params);
  return result;
};

export const getRecentFiles = async (limit = 10) => {
  const db = await getDB();

  const result = await db.getAllAsync(
    `
    SELECT files.*, folders.name as folderName
    FROM files
    LEFT JOIN folders ON files.folderId = folders.id
    ORDER BY COALESCE(files.lastOpenedAt, files.createdAt) DESC
    LIMIT ?
    `,
    [limit],
  );

  return result;
};

/**
 * Total bytes used by stored files (links take no space).
 */
export const getStorageUsed = async () => {
  const db = await getDB();
  const row = await db.getFirstAsync(
    `SELECT COALESCE(SUM(size), 0) AS total, COUNT(*) AS count FROM files WHERE type != 'link'`,
  );
  return { bytes: row?.total || 0, count: row?.count || 0 };
};

export const getFavoriteFiles = async () => {
  const db = await getDB();

  const result = await db.getAllAsync(`
    SELECT files.*, folders.name as folderName
    FROM files
    LEFT JOIN folders ON files.folderId = folders.id
    WHERE files.isFavorite = 1
    ORDER BY files.createdAt DESC
  `);

  return result;
};

/**
 * Record that a file was opened (drives "unread" dot and "last opened").
 */
export const markFileOpened = async (fileId) => {
  const db = await getDB();
  const now = Date.now();
  await db.runAsync(`UPDATE files SET lastOpenedAt = ? WHERE id = ?`, [
    now,
    fileId,
  ]);
  return now;
};

/**
 * Move one or more files to another folder.
 */
export const moveFiles = async (fileIds, targetFolderId) => {
  if (!fileIds?.length) return 0;
  if (!targetFolderId) throw new Error("Target folder is required");
  const db = await getDB();
  const placeholders = fileIds.map(() => "?").join(",");
  const result = await db.runAsync(
    `UPDATE files SET folderId = ? WHERE id IN (${placeholders})`,
    [targetFolderId, ...fileIds],
  );
  return result.changes;
};

/**
 * Delete several files (database rows and stored copies on disk).
 */
export const deleteFiles = async (fileIds) => {
  for (const id of fileIds) {
    await deleteFile(id);
  }
  return true;
};
