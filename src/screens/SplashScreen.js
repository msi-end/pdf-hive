import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Image, Animated, Easing } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { COLORS } from "../constants/colors";

export default function SplashScreen() {
  const navigation = useNavigation();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 600,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      navigation.replace("MainApp");
    });
  }, []);

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "80%"],
  });

  return (
    <View style={styles.container}>
      {/* Logo Box */}
      <View style={styles.logoWrapper}>
        <Image
          source={require("../../assets/logo-bg-removed.png")}
          style={styles.logo}
          resizeMode="cover"
        />
      </View>

      {/* App Name */}
      <Text style={styles.title}>PDF Hive</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>ACADEMIC DOCUMENT MANAGER</Text>

      {/* Loading Section */}
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Organizing your library...</Text>

        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[styles.progressBarFill, { width: widthInterpolated }]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8E6F4", // soft lavender background
    alignItems: "center",
    justifyContent: "center",
  },

  logoWrapper: {
    // backgroundColor: "#DCD8F3",
    padding: 0,
    borderRadius: 30,
    marginBottom: 0,
  },

  logo: {
    width: 250,
    height: 250,
    borderRadius: 30,

  },

  title: {
    fontSize: 40,
    fontWeight: "800",
    color: "#070574",
    letterSpacing: 0.5,
  },

  subtitle: {
    marginTop: 10,
    fontSize: 14,
    letterSpacing: 0,
    color: "#3e3bffad",
  },

  loadingContainer: {
    position: "absolute",
    bottom: 120,
    width: "80%",
    alignItems: "center",
  },

  loadingText: {
    fontSize: 18,
    color: "#6E6E7E",
    marginBottom: 15,
  },

  progressBarBackground: {
    width: "100%",
    height: 8,
    backgroundColor: "#CFCBEA",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
});
