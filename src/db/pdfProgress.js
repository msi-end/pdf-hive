// /db/pdfProgress.js
import { getDB } from './database';

/**
 * Get single file by id
 */
export const getFileById = async (fileId) => {
  const db = await getDB();

  const row = await db.getFirstAsync(
    `SELECT * FROM files WHERE id = ?`,
    [fileId]
  );

  return row || null;
};

/**
 * Update last opened page for PDF
 */
export const updateLastOpenedPage = async (fileId, page) => {
  const db = await getDB();

  const result = await db.runAsync(
    `UPDATE files
     SET lastOpenedPage = ?
     WHERE id = ?`,
    [page, fileId]
  );

  return result.changes > 0;
};
