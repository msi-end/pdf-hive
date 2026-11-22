import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";


export default function AddFileSheet({
  visible,
  onClose,
  onImportPdf,
  onAddImage,
  onAddLink,
}) {
const insets = useSafeAreaInsets();

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

          <Text style={styles.title}>ADD TO FOLDER</Text>

          {/* Options */}
          <Option
            icon="document-text"
            title="Import PDF"
            subtitle="Pick one or more PDFs from your device"
            onPress={onImportPdf}
          />

          <Option
            icon="image"
            title="Add Image"
            subtitle="Add photos of notes from your gallery"
            onPress={onAddImage}
          />

          <Option
            icon="link"
            title="Add PDF Link"
            subtitle="Read a PDF from a web address"
            onPress={onAddLink}
          />

          {/* Cancel */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Option({ icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.option} onPress={onPress}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={24} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
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
    // backgroundColor: "rgba(0,0,0,0.35)",
    // backgroundColor: "rgb(255, 255, 255)",
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
    fontSize: 14,
    fontWeight: "700",
    color: "#4f46e5",
    letterSpacing: 1,
    marginBottom: 16,
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#e0e7ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },

  optionSubtitle: {
    fontSize: 13,
    color: "#6b7280",
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
