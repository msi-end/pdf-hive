import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFolders, createFolder } from "../../db/folders";
import { showToast } from "../CustomToast";

/**
 * Bottom sheet listing folders to pick from, with inline "New folder".
 *
 * Props:
 *  - visible, onClose
 *  - title: header text
 *  - excludeFolderId: hide this folder (e.g. the current one when moving)
 *  - onSelect(folder): called with the chosen folder
 *  - busy: show a spinner and block input while the caller works
 *  - children: optional content above the list (e.g. a name field)
 */
export default function FolderPickerSheet({
  visible,
  onClose,
  title = "Choose folder",
  excludeFolderId = null,
  onSelect,
  busy = false,
  children,
}) {
  const insets = useSafeAreaInsets();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (visible) {
      loadFolders();
    } else {
      setCreating(false);
      setNewName("");
    }
  }, [visible]);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const data = await getFolders();
      setFolders(data.filter((f) => f.id !== excludeFolderId));
    } catch (e) {
      console.log("Failed to load folders", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const id = await createFolder(name, "#4f46e5");
      const folder = { id, name, color: "#4f46e5" };
      setCreating(false);
      setNewName("");
      onSelect?.(folder);
    } catch (e) {
      showToast({ message: e.message || "Failed to create folder", type: "error" });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={busy ? undefined : onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={busy ? undefined : onClose}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>

        {children}

        {loading ? (
          <ActivityIndicator style={{ marginVertical: 24 }} color="#4f46e5" />
        ) : (
          <FlatList
            data={folders}
            keyExtractor={(item) => item.id.toString()}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.empty}>
                No other folders yet. Create one below.
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                disabled={busy}
                onPress={() => onSelect?.(item)}
              >
                <Ionicons
                  name="folder"
                  size={24}
                  color={item.color || "#4f46e5"}
                />
                <Text style={styles.rowText} numberOfLines={1}>
                  {item.name}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          />
        )}

        {creating ? (
          <View style={styles.createRow}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="New folder name"
              placeholderTextColor="#9ca3af"
              style={styles.createInput}
              autoFocus
              onSubmitEditing={handleCreate}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.createBtn}
              onPress={handleCreate}
              disabled={busy}
            >
              <Text style={styles.createBtnText}>Create</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.newFolder}
            onPress={() => setCreating(true)}
            disabled={busy}
          >
            <Ionicons name="add-circle-outline" size={22} color="#4f46e5" />
            <Text style={styles.newFolderText}>New folder</Text>
          </TouchableOpacity>
        )}

        {busy ? (
          <ActivityIndicator style={{ marginTop: 12 }} color="#4f46e5" />
        ) : (
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
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
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    maxHeight: "75%",
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
    color: "#6366f1",
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  list: {
    flexGrow: 0,
  },
  empty: {
    textAlign: "center",
    color: "#6b7280",
    marginVertical: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#f3f4f6",
    gap: 12,
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  newFolder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  newFolderText: {
    color: "#4f46e5",
    fontSize: 16,
    fontWeight: "600",
  },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  createInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
  },
  createBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  createBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  cancelBtn: {
    marginTop: 8,
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
