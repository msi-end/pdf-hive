import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";

/**
 * Small centred menu for choosing a sort order.
 * options: [{ key, label, icon }]
 */
export default function SortMenu({ visible, onClose, options, value, onChange }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menu}>
          <Text style={styles.title}>Sort by</Text>
          {options.map((option) => {
            const active = value === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={styles.option}
                onPress={() => onChange(option.key)}
              >
                <Ionicons
                  name={option.icon}
                  size={18}
                  color={active ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={[styles.optionText, active && styles.optionActive]}>
                  {option.label}
                </Text>
                {active && (
                  <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

/**
 * Pill button showing the current sort, e.g. "⇅ Newest first".
 */
export function SortButton({ label, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Ionicons name="swap-vertical" size={16} color={COLORS.primary} />
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  menu: {
    width: "80%",
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primaryLight,
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
  },
  optionActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primarySoft,
  },
  buttonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },
});
