import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";

export default function OptionsSheet({
  visible,
  onClose,
  onEdit,
  onChangeColor,
  onDelete,
  onMark,
  onFavorite,
  onMove,
  isFolder = false,
}) {

const insets = useSafeAreaInsets();

  function GridItem({ icon, label, onPress, danger }) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.gridItem,
          danger && styles.dangerItem,
          pressed && (danger ? styles.dangerPressed : styles.normalPressed),
        ]}
      >
        <View style={styles.row}>
          <FontAwesome5
            style={{ opacity: 0.5 }}
            name={icon}
            size={28}
            color={danger ? "#dc2626" : "#4f46e5"}
          />

          <Text style={[styles.gridLabel, danger && { color: "#dc2626" }]}>
            {label}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      ></TouchableOpacity>
      <View style={[styles.overlay, { paddingBottom: insets.bottom }]}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          <Text style={styles.title}>OPTIONS</Text>

          {/* GRID */}
          <View style={styles.grid}>
            <GridItem
              icon="edit"
              label="Rename"
              onPress={onEdit}
            />

            {isFolder && (
              <GridItem icon="edit" label="Color" onPress={onChangeColor} />
            )}

            <GridItem icon="check-circle" label="Mark" onPress={onMark} />
            <GridItem icon="heart" label="Favorite" onPress={onFavorite} />
            {onMove && (
              <GridItem icon="folder-open" label="Move" onPress={onMove} />
            )}
            <GridItem icon="trash" label="Delete" danger onPress={onDelete} />
          </View>

          {/* Cancel */}
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
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 24,
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
    marginBottom: 16,
  },

  /* GRID */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  gridItem: {
    width: "47%",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    justifyContent: "space-around",
    backgroundColor: "#e7f0fa",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12, // icon ↔ text spacing
  },

  gridLabel: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  /* DANGER */
  dangerItem: {
    backgroundColor: "#fff1f2",
  },

  /* PRESS EFFECT */
  normalPressed: {
    backgroundColor: "#dbeafe", // darker blue
  },

  dangerPressed: {
    backgroundColor: "#fee2e2", // darker red
  },

  cancelBtn: {
    marginTop: 12,
    marginHorizontal: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },

  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
