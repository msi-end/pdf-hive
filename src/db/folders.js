// /db/folders.js
import { getDB } from "./database";

/**
 * Helper: check if folder name already exists
 */
const folderExists = async (name, excludeId = null) => {
  const db = await getDB();

  const query = excludeId
    ? `SELECT id FROM folders WHERE LOWER(name) = LOWER(?) AND id != ?`
    : `SELECT id FROM folders WHERE LOWER(name) = LOWER(?)`;

  const params = excludeId ? [name, excludeId] : [name];

  const rows = await db.getAllAsync(query, params);
  return rows.length > 0;
};

/**
 * Create Folder
 */
export const createFolder = async (name, color) => {
  if (!name?.trim()) throw new Error("Folder name is required");

  const exists = await folderExists(name);
  if (exists) throw new Error("Folder with this name already exists");

  const db = await getDB();
  const createdAt = Date.now();

  const result = await db.runAsync(
    `INSERT INTO folders (name,color,createdAt) VALUES (?, ?, ?)`,
    [name.trim(), color?.trim() || "#4f46e5", createdAt],
  );
  return result.lastInsertRowId;
};

/**
 * Fetch All Folders
 */
export const getFolders = async () => {
  const db = await getDB();

  return await db.getAllAsync(`SELECT * FROM folders ORDER BY createdAt DESC`);
};

/**
 * Rename Folder
 */
export const renameFolder = async (folderId, newName, newColor) => {
  if (!newName?.trim()) throw new Error("Folder name is required");

  const exists = await folderExists(newName, folderId);
  if (exists) throw new Error("Folder with this name already exists");

  const db = await getDB();

  const result = await db.runAsync(`UPDATE folders SET name = ?, color = ? WHERE id = ?`, [
    newName.trim(),
    newColor?.trim() || "#4f46e5",
    folderId,
  ]);

  return result.changes > 0;
};

/**
 * Delete Folder (and all its files)
 */
export const deleteFolder = async (folderId) => {
  const db = await getDB();

  await db.runAsync(`DELETE FROM files WHERE folderId = ?`, [folderId]);

  await db.runAsync(`DELETE FROM folders WHERE id = ?`, [folderId]);

  return true;
};

export const toggleMarkedFolder = async (folderId, value) => {
  const db = await getDB();

  await db.runAsync(`UPDATE folders SET isMarked = ? WHERE id = ?`, [
    value,
    folderId,
  ]);
};
