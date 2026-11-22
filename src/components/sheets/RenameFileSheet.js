import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";

/**
 * Bottom sheet for renaming a file. For PDFs the ".pdf" extension is kept
 * automatically, so users only edit the name itself.
 */
export default function RenameFileSheet({ visible, file, onClose, onSave }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const isPdf = file?.type === "pdf";

  useEffect(() => {
    if (visible && file) {
      setName(isPdf ? file.name.replace(/\.pdf$/i, "") : file.name);
      setSaving(false);
    }
  }, [visible, file]);

  const trimmed = name.trim();
  const finalName = isPdf && trimmed ? `${trimmed}.pdf` : trimmed;
  const unchanged = finalName === file?.name;

  const handleSave = async () => {
    if (!trimmed || unchanged || saving) return;
    setSaving(true);
    try {
      await onSave(finalName);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>Rename file</Text>

        <View style={styles.inputRow}>
          <Ionicons
            name={
              file?.type === "image"
                ? "image"
                : file?.type === "link"
                  ? "link"
                  : "document-text"
            }
            size={22}
            color={COLORS.primaryLight}
          />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="File name"
            placeholderTextColor={COLORS.textFaint}
            style={styles.input}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          {isPdf && <Text style={styles.ext}>.pdf</Text>}
        </View>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            (!trimmed || unchanged || saving) && styles.saveBtnDisabled,
          ]}
          disabled={!trimmed || unchanged || saving}
          onPress={handleSave}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.saveText}>{saving ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#d1d5db",
    alignSelf: "center",
    marginVertical: 10,
  },
  title: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primaryLight,
    letterSpacing: 1,
    marginBottom: 16,
    textTransform: "uppercase",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#f9fafb",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 14,
  },
  ext: {
    fontSize: 15,
    color: COLORS.textFaint,
    fontWeight: "600",
  },
  saveBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelBtn: {
    marginTop: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
});
