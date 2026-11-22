import JSZip from "jszip";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import { getDB } from "./database";

/**
 * Backup format (a .zip file):
 *   manifest.json   – app id, format version, folders and file metadata
 *   files/<id>.<ext> – the stored PDFs and images (links have no file)
 *
 * Restoring merges into the current library: folders are matched by name,
 * and files that are already there (same folder, name, type and date added)
 * are skipped, so restoring the same backup twice doesn't create duplicates.
 */

const APP_ID = "pdf-hive";
const FORMAT_VERSION = 1;
const MANIFEST = "manifest.json";

const PDF_DIR = `${FileSystem.documentDirectory}pdfs/`;
const IMAGE_DIR = `${FileSystem.documentDirectory}images/`;
const BACKUP_PREFIX = "PDF-Hive-backup-";

const BASE64 = { encoding: FileSystem.EncodingType.Base64 };

const ensureDir = async (dir) => {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
};

const extensionOf = (path, type) => {
  const match = /\.([a-z0-9]{1,5})$/i.exec(path || "");
  if (match) return match[1].toLowerCase();
  return type === "pdf" ? "pdf" : "jpg";
};

const uniqueName = (ext) =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

const pad = (n) => String(n).padStart(2, "0");
const backupFileName = () => {
  const d = new Date();
  return `${BACKUP_PREFIX}${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}_${pad(d.getHours())}${pad(d.getMinutes())}.zip`;
};

/**
 * Rough size of what a backup will contain (bytes of stored files).
 */
export const estimateBackupSize = async () => {
  const db = await getDB();
  const row = await db.getFirstAsync(
    `SELECT COALESCE(SUM(size), 0) AS bytes, COUNT(*) AS files FROM files`,
  );
  const folders = await db.getFirstAsync(`SELECT COUNT(*) AS n FROM folders`);
  return { bytes: row?.bytes || 0, files: row?.files || 0, folders: folders?.n || 0 };
};

/**
 * Remove backup zips left in the cache by earlier exports.
 */
const cleanOldBackups = async () => {
  try {
    const names = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
    await Promise.all(
      names
        .filter((n) => n.startsWith(BACKUP_PREFIX))
        .map((n) =>
          FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${n}`, {
            idempotent: true,
          }),
        ),
    );
  } catch {}
};

/**
 * Create a backup zip in the cache directory.
 * onProgress({ stage: "packing" | "saving", current, total })
 * Returns { uri, fileName, folders, files, missing }.
 */
export const createBackup = async (onProgress) => {
  const db = await getDB();
  const folders = await db.getAllAsync(`SELECT * FROM folders ORDER BY id`);
  const files = await db.getAllAsync(`SELECT * FROM files ORDER BY id`);

  if (!folders.length && !files.length) {
    throw new Error("There's nothing to back up yet.");
  }

  const zip = new JSZip();
  const manifestFiles = [];
  let missing = 0;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    onProgress?.({ stage: "packing", current: i + 1, total: files.length });

    const entry = {
      id: f.id,
      folderId: f.folderId,
      name: f.name,
      type: f.type,
      size: f.size || 0,
      isFavorite: f.isFavorite || 0,
      isMarked: f.isMarked || 0,
      lastOpenedPage: f.lastOpenedPage ?? null,
      lastOpenedAt: f.lastOpenedAt ?? null,
      createdAt: f.createdAt,
    };

    if (f.type === "link") {
      entry.url = f.path;
    } else {
      const info = await FileSystem.getInfoAsync(f.path);
      if (!info.exists) {
        // File was removed from the device; keep going without it
        missing++;
        continue;
      }
      const data = await FileSystem.readAsStringAsync(f.path, BASE64);
      const archivePath = `files/${f.id}.${extensionOf(f.path, f.type)}`;
      zip.file(archivePath, data, { base64: true });
      entry.archivePath = archivePath;
    }

    manifestFiles.push(entry);
  }

  const manifest = {
    app: APP_ID,
    version: FORMAT_VERSION,
    createdAt: Date.now(),
    folders: folders.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color,
      isMarked: f.isMarked || 0,
      createdAt: f.createdAt,
    })),
    files: manifestFiles,
  };
  zip.file(MANIFEST, JSON.stringify(manifest));

  onProgress?.({ stage: "saving", current: files.length, total: files.length });

  // PDFs and photos are already compressed; storing is much faster on phones
  const data = await zip.generateAsync({ type: "base64", compression: "STORE" });

  await cleanOldBackups();
  const fileName = backupFileName();
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, data, BASE64);

  return {
    uri,
    fileName,
    folders: folders.length,
    files: manifestFiles.length,
    missing,
  };
};

/**
 * Let the user pick a backup zip. Returns its URI, or null if cancelled.
 */
export const pickBackupFile = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream",
      "*/*",
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0];
};

/**
 * Read and validate a backup zip.
 */
const openBackup = async (uri) => {
  let zip;
  try {
    const data = await FileSystem.readAsStringAsync(uri, BASE64);
    zip = await JSZip.loadAsync(data, { base64: true });
  } catch {
    throw new Error("This file isn't a valid backup (.zip).");
  }

  const manifestEntry = zip.file(MANIFEST);
  if (!manifestEntry) throw new Error("This isn't a PDF Hive backup.");

  let manifest;
  try {
    manifest = JSON.parse(await manifestEntry.async("string"));
  } catch {
    throw new Error("The backup is damaged and can't be read.");
  }

  if (manifest?.app !== APP_ID) throw new Error("This isn't a PDF Hive backup.");
  if (manifest.version > FORMAT_VERSION) {
    throw new Error(
      "This backup was made by a newer version of PDF Hive. Please update the app.",
    );
  }
  return { zip, manifest };
};

/**
 * Restore (merge) a backup into the current library.
 * onProgress({ stage: "reading" | "restoring", current, total })
 * Returns { foldersAdded, filesAdded, skipped, failed }.
 */
export const restoreBackup = async (uri, onProgress) => {
  onProgress?.({ stage: "reading", current: 0, total: 0 });
  const { zip, manifest } = await openBackup(uri);
  const db = await getDB();

  await ensureDir(PDF_DIR);
  await ensureDir(IMAGE_DIR);

  // 1. Folders: reuse an existing folder with the same name, else create it
  const folderMap = {};
  let foldersAdded = 0;
  for (const folder of manifest.folders || []) {
    const name = (folder.name || "").trim() || "Restored";
    const existing = await db.getFirstAsync(
      `SELECT id FROM folders WHERE LOWER(name) = LOWER(?)`,
      [name],
    );
    if (existing) {
      folderMap[folder.id] = existing.id;
    } else {
      const res = await db.runAsync(
        `INSERT INTO folders (name, color, isMarked, createdAt) VALUES (?, ?, ?, ?)`,
        [name, folder.color || "#4f46e5", folder.isMarked || 0, folder.createdAt || Date.now()],
      );
      folderMap[folder.id] = res.lastInsertRowId;
      foldersAdded++;
    }
  }

  // Files whose folder is missing from the manifest go to a "Restored" folder
  let fallbackFolderId = null;
  const getFallbackFolder = async () => {
    if (fallbackFolderId) return fallbackFolderId;
    const existing = await db.getFirstAsync(
      `SELECT id FROM folders WHERE LOWER(name) = LOWER(?)`,
      ["Restored"],
    );
    if (existing) return (fallbackFolderId = existing.id);
    const res = await db.runAsync(
      `INSERT INTO folders (name, color, createdAt) VALUES (?, ?, ?)`,
      ["Restored", "#4f46e5", Date.now()],
    );
    foldersAdded++;
    return (fallbackFolderId = res.lastInsertRowId);
  };

  // 2. Files
  const files = manifest.files || [];
  let filesAdded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    onProgress?.({ stage: "restoring", current: i + 1, total: files.length });

    try {
      const folderId = folderMap[f.folderId] || (await getFallbackFolder());

      const duplicate = await db.getFirstAsync(
        `SELECT id FROM files WHERE folderId = ? AND name = ? AND type = ? AND createdAt = ?`,
        [folderId, f.name, f.type, f.createdAt],
      );
      if (duplicate) {
        skipped++;
        continue;
      }

      let path;
      if (f.type === "link") {
        path = f.url;
        if (!path) throw new Error("Link has no URL");
      } else {
        const entry = f.archivePath && zip.file(f.archivePath);
        if (!entry) throw new Error("File missing from backup");
        const data = await entry.async("base64");
        const dir = f.type === "image" ? IMAGE_DIR : PDF_DIR;
        path = `${dir}${uniqueName(extensionOf(f.archivePath, f.type))}`;
        await FileSystem.writeAsStringAsync(path, data, BASE64);
      }

      await db.runAsync(
        `INSERT INTO files
          (name, type, path, folderId, isFavorite, isMarked, lastOpenedPage, lastOpenedAt, size, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          f.name,
          f.type,
          path,
          folderId,
          f.isFavorite || 0,
          f.isMarked || 0,
          f.lastOpenedPage ?? null,
          f.lastOpenedAt ?? null,
          f.size || 0,
          f.createdAt || Date.now(),
        ],
      );
      filesAdded++;
    } catch (e) {
      console.log("Failed to restore file:", f?.name, e);
      failed++;
    }
  }

  return { foldersAdded, filesAdded, skipped, failed };
};
