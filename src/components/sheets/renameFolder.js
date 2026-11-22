import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
export default function RenameFolderSheet({
  visible,
  onClose,
  initialName = "",
  initialColor = "#6366F1",
  onSave,
}) {
  const [folderName, setFolderName] = useState("");
  const [color, setColor] = useState(initialColor);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setFolderName(initialName);
      setColor(initialColor);
    }
  }, [visible, initialName, initialColor]);

  const handleSave = () => {
    if (!folderName.trim()) return;

    onSave({
      name: folderName.trim(),
      color,
    });

    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      ></TouchableOpacity>
      <View style={[styles.overlay, { paddingBottom: insets.bottom }]}>
        <View style={styles.sheet}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Title */}
          <Text style={styles.title}>Edit Folder</Text>

          {/* Folder Name */}
          <Text style={styles.label}>Folder Name</Text>
          <TextInput
            placeholder="e.g. Biology Notes"
            value={folderName}
            onChangeText={setFolderName}
            style={styles.input}
          />

          {/* Color Picker */}
          <Text style={styles.label}>Folder Color</Text>
          <View style={styles.colorRow}>
            {["#6366F1", "#22C55E", "#F97316", "#EF4444"].map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  color === c && styles.activeColor,
                ]}
              />
            ))}
          </View>
          <View style={{ height: 100, backgroundColor: "#fff" }}></View>
          {/* Actions */}
          <TouchableOpacity style={styles.createBtn} onPress={handleSave}>
            <Ionicons name="save" size={20} color="#FFF" />
            <Text style={styles.createText}>Save Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 4,
    backgroundColor: "rgba(207, 207, 207, 0)",
    justifyContent: "center", // Centers the content vertically
    alignItems: "center", // Centers the content horizontally
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(158, 158, 158, 0.3)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    marginBottom: 18,
  },
  colorRow: {
    flexDirection: "row",
    marginBottom: 24,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  activeColor: {
    borderWidth: 3,
    borderColor: "#111827",
  },
  createBtn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  createText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  cancelBtn: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },
  cancelText: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
});
