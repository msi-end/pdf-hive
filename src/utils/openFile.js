import { markFileOpened } from "../db/files";

/**
 * Open any stored item. PDFs and PDF links open in the in-app reader,
 * images in the image viewer. Records the open time for "last opened".
 */
export const openFile = (item, navigation) => {
  if (!item) return;

  markFileOpened(item.id).catch((e) =>
    console.log("Failed to record file open:", e),
  );

  if (item.type === "image") {
    navigation.navigate("ImageViewer", { fileId: item.id });
  } else if (item.type === "pdf" || item.type === "link") {
    navigation.navigate("PdfReader", { fileId: item.id });
  }
};
