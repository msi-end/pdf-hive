import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { addFile } from "./files";

/**
 * App directory for PDFs
 */
const PDF_DIR = `${FileSystem.documentDirectory}pdfs/`;

/**
 * Ensure PDF directory exists
 */
const ensurePdfDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(PDF_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PDF_DIR, { intermediates: true });
  }
};

/**
 * Generate unique filename (safe for the file system)
 */
const generateUniqueFileName = (originalName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 6);
  const cleanName = originalName.replace(/[^\w.-]+/g, "_");
  return `${timestamp}_${random}_${cleanName}`;
};

/**
 * Make sure a display name ends with .pdf
 */
const ensurePdfExtension = (name) => {
  const trimmed = (name || "").trim() || "Document";
  return /\.pdf$/i.test(trimmed) ? trimmed : `${trimmed}.pdf`;
};

/**
 * Copy a PDF from any readable URI (file://, content://) into app storage
 * and save it in SQLite. Used by the picker and by "Open with".
 */
export const savePdfFromUri = async ({ uri, name, size, folderId }) => {
  if (!folderId) throw new Error("folderId is required");
  if (!uri) throw new Error("File URI is required");

  await ensurePdfDir();

  const displayName = ensurePdfExtension(name);
  const destinationPath = `${PDF_DIR}${generateUniqueFileName(displayName)}`;

  await FileSystem.copyAsync({ from: uri, to: destinationPath });

  let finalSize = size || 0;
  if (!finalSize) {
    try {
      const info = await FileSystem.getInfoAsync(destinationPath);
      finalSize = info.exists ? info.size || 0 : 0;
    } catch {}
  }

  const fileId = await addFile({
    name: displayName,
    type: "pdf",
    path: destinationPath,
    folderId,
    size: finalSize,
    lastOpenedPage: 1,
  });

  return {
    id: fileId,
    name: displayName,
    path: destinationPath,
    size: finalSize,
    folderId,
    type: "pdf",
  };
};

/**
 * Import one or more PDFs picked from the device.
 * Returns { imported: [...files], failed: [...names] },
 * or null if the user cancelled the picker.
 */
export const importPdfs = async (folderId) => {
  if (!folderId) throw new Error("folderId is required");

  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: false,
    multiple: true,
  });

  if (result.canceled || !result.assets?.length) return null;

  const imported = [];
  const failed = [];

  for (const asset of result.assets) {
    try {
      imported.push(
        await savePdfFromUri({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          folderId,
        }),
      );
    } catch (error) {
      console.log("Failed to import PDF:", asset.name, error);
      failed.push(asset.name);
    }
  }

  if (!imported.length && failed.length) {
    throw new Error(
      failed.length === 1
        ? `Failed to import ${failed[0]}`
        : `Failed to import ${failed.length} PDFs`,
    );
  }

  return { imported, failed };
};
