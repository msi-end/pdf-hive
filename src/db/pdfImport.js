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
 * Generate unique filename
 */
const generateUniqueFileName = (originalName) => {
  const timestamp = Date.now();
  const cleanName = originalName.replace(/\s+/g, "_");
  return `${timestamp}_${cleanName}`;
};

/**
 * Pick PDF from device
 */
const pickPdf = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: false,
    multiple: false,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0];
};

/**
 * Import PDF:
 * - Pick PDF
 * - Copy to app storage
 * - Save metadata in SQLite
 */
export const importPdf = async (folderId) => {
  try {
    if (!folderId) throw new Error("folderId is required");

    await ensurePdfDir();

    const pickedFile = await pickPdf();
    if (!pickedFile) return null;

    const uniqueName = generateUniqueFileName(pickedFile.name);
    const destinationPath = `${PDF_DIR}${uniqueName}`;

    await FileSystem.copyAsync({
      from: pickedFile.uri,
      to: destinationPath,
    });

    const fileId = await addFile({
      name: pickedFile.name,
      type: "pdf",
      path: destinationPath,
      folderId,
      size: pickedFile.size || 0,
      lastOpenedPage: 1,
    });

    return {
      status: true,
      id: fileId,
      name: pickedFile.name,
      path: destinationPath,
      size: pickedFile.size || 0,
      folderId,
      type: "pdf",
    };
  } catch (error) {
    if (
      error.message?.includes("permission") ||
      error.message?.includes("Permission")
    ) {
      throw new Error("File permission denied");
    }
    throw error;
  }
};
