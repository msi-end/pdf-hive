import React, { useEffect, useState, useRef } from "react";
import { Text, Animated, StyleSheet, Dimensions } from "react-native";
import { COLORS } from "../constants/colors";

const { width } = Dimensions.get("window");

let showToastInternal;

export const showToast = ({ message, type = "success", duration = 3000 }) => {
  if (showToastInternal) {
    showToastInternal({ message, type, duration });
  }
};

export default function CustomToast() {
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
  
  // 1. Use useRef so the animation value survives re-renders
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    showToastInternal = ({ message, type, duration }) => {
      setToast({ visible: true, message, type });

      // 2. Animate In
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // 3. Wait, then Animate Out
      setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setToast((prev) => ({ ...prev, visible: false }));
        });
      }, duration);
    };
  }, [slideAnim]); // slideAnim is stable, but good practice to include

  if (!toast.visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: toast.type === "error" ? "#ef4444" : COLORS.success,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.text}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: width * 0.05, // Centering logic
    width: width * 0.9,
    padding: 16,
    borderRadius: 8,
    elevation: 10, // Higher elevation for Android
    zIndex: 10000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  text: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
});