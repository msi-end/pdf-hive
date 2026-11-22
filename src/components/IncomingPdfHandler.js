import React, { useEffect, useRef, useState } from "react";
import { Text, TextInput, StyleSheet } from "react-native";
import * as Linking from "expo-linking";
import { useNavigation } from "@react-navigation/native";
import FolderPickerSheet from "./sheets/FolderPickerSheet";
import { savePdfFromUri } from "../db/pdfImport";
import { showToast } from "./CustomToast";
import { suppressAppOpenAd } from "../ads/appOpenManager";

// Wait for the splash screen to hand over to the main app on cold start
const COLD_START_DELAY_MS = 1500;

/**
 * Only file / content URIs are documents. Ignore normal deep links
 * (exp://, https://, the app scheme) so they keep working as before.
 */
const isIncomingFile = (url) =>
  typeof url === "string" &&
  (url.startsWith("content://") || url.startsWith("file://"));

/**
 * Best-effort readable name from a file/content URI.
 */
const guessName = (url) => {
  try {
    const last = decodeURIComponent(url.split("?")[0].split("/").pop() || "");
    // Content providers often end in an opaque id like "1234" or "document:42"
    if (/\.pdf$/i.test(last)) return last.replace(/^.*[:/]/, "");
  } catch {}
  return "Shared PDF";
};

/**
 * Handles PDFs opened with PDF Hive from other apps ("Open with").
 * Must be rendered inside NavigationContainer.
 */
export default function IncomingPdfHandler() {
  const navigation = useNavigation();
  const [incoming, setIncoming] = useState(null); // { uri }
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const lastHandled = useRef(null);

  useEffect(() => {
    const handle = (url, delay = 0) => {
      if (!isIncomingFile(url) || url === lastHandled.current) return;
      lastHandled.current = url;
      suppressAppOpenAd(10000);
      setTimeout(() => {
        setName(guessName(url).replace(/\.pdf$/i, ""));
        setIncoming({ uri: url });
      }, delay);
    };

    // App launched by "Open with"
    Linking.getInitialURL()
      .then((url) => handle(url, COLD_START_DELAY_MS))
      .catch(() => {});

    // App already running
    const sub = Linking.addEventListener("url", ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  const close = () => {
    if (saving) return;
    setIncoming(null);
  };

  const handleSelect = async (folder) => {
    if (!incoming || saving) return;
    setSaving(true);
    try {
      const file = await savePdfFromUri({
        uri: incoming.uri,
        name: name.trim() || "Shared PDF",
        folderId: folder.id,
      });
      setIncoming(null);
      showToast({ message: `Saved to ${folder.name}`, type: "success" });
      navigation.navigate("PdfReader", { fileId: file.id });
    } catch (e) {
      console.log("Failed to save incoming PDF:", e);
      showToast({ message: "Couldn't save this PDF", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FolderPickerSheet
      visible={!!incoming}
      onClose={close}
      title="Save PDF to folder"
      onSelect={handleSelect}
      busy={saving}
    >
      <Text style={styles.label}>File name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="File name"
        placeholderTextColor="#9ca3af"
        style={styles.input}
        editable={!saving}
      />
      <Text style={styles.label}>Choose a folder</Text>
    </FolderPickerSheet>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    marginBottom: 12,
  },
});
