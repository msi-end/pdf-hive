import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getFileById, toggleFavorite, deleteFile } from "../db/files";
import { COLORS } from "../constants/colors";

const { width, height } = Dimensions.get("window");
const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/**
 * Pinch to zoom, drag to pan when zoomed, double-tap to zoom in/out.
 */
function useZoom() {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Committed values at the end of the last gesture
  const saved = useRef({ scale: 1, x: 0, y: 0 });
  // Live values during a gesture
  const live = useRef({ scale: 1, x: 0, y: 0 });

  const clampTranslation = (x, y, s) => {
    const maxX = ((s - 1) * width) / 2;
    const maxY = ((s - 1) * height) / 2;
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  };

  const animateTo = (s, x, y) => {
    saved.current = { scale: s, x, y };
    live.current = { scale: s, x, y };
    Animated.parallel([
      Animated.spring(scale, { toValue: s, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: x, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: y, useNativeDriver: true }),
    ]).start();
  };

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onUpdate((e) => {
      const s = clamp(saved.current.scale * e.scale, MIN_SCALE, MAX_SCALE);
      live.current.scale = s;
      scale.setValue(s);
    })
    .onEnd(() => {
      const s = live.current.scale;
      if (s <= 1.01) {
        animateTo(1, 0, 0);
      } else {
        const t = clampTranslation(live.current.x, live.current.y, s);
        animateTo(s, t.x, t.y);
      }
    });

  const pan = Gesture.Pan()
    .runOnJS(true)
    .averageTouches(true)
    .onUpdate((e) => {
      if (live.current.scale <= 1) return;
      const t = clampTranslation(
        saved.current.x + e.translationX,
        saved.current.y + e.translationY,
        live.current.scale,
      );
      live.current.x = t.x;
      live.current.y = t.y;
      translateX.setValue(t.x);
      translateY.setValue(t.y);
    })
    .onEnd(() => {
      saved.current = { ...live.current };
    });

  const doubleTap = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .onEnd(() => {
      if (saved.current.scale > 1) animateTo(1, 0, 0);
      else animateTo(DOUBLE_TAP_SCALE, 0, 0);
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);
  const style = {
    transform: [{ translateX }, { translateY }, { scale }],
  };

  return { gesture, style };
}

export default function ImageViewerScreen({ route, navigation }) {
  const { fileId } = route.params;

  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);

  const zoom = useZoom();

  useEffect(() => {
    loadImage();
  }, []);

  const loadImage = async () => {
    try {
      const imageFile = await getFileById(fileId);
      if (!imageFile) throw new Error("Image not found in database");

      const info = await FileSystem.getInfoAsync(imageFile.path);
      if (!info.exists) throw new Error("Image file not found on device");

      setImageFile(imageFile);
      setFile(imageFile);
    } catch (error) {
      Alert.alert("Error", error.message, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  };
  const Action = ({ icon, label, color, onPress }) => (
    <TouchableOpacity
      style={styles.actionItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.actionLabel, { color }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const handleShare = async () => {
    try {
      if (file.type === "link") {
        await Sharing.shareAsync(file.path);
        return;
      }

      const info = await FileSystem.getInfoAsync(file.path);
      if (!info.exists) throw new Error("File not found");

      await Sharing.shareAsync(file.path);
    } catch (error) {
      Alert.alert("Error", "Unable to share file");
    }
  };
  const handleFavorite = async () => {
    try {
      const newValue = file.isFavorite ? 0 : 1;
      await toggleFavorite(file.id, newValue);
      setFile((prev) => ({ ...prev, isFavorite: newValue }));
    } catch (error) {
      Alert.alert("Error", "Failed to update favorite");
    }
  };
  const handleDelete = () => {
    Alert.alert("Delete File?", "This file will be permanently deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // removes from DB and device storage
            await deleteFile(file.id);

            navigation.goBack();
          } catch {
            Alert.alert("Error", "Failed to delete file");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!imageFile) return null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <GestureHandlerRootView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#4f46e5" />
          </TouchableOpacity>

          <Text style={styles.title} numberOfLines={1}>
            {imageFile.name || "Image Preview"}
          </Text>

          {/* spacer keeps the title centred */}
          <View style={{ width: 28 }} />
        </View>

        {/* Image */}
        <GestureDetector gesture={zoom.gesture}>
          <View style={styles.imageWrapper} collapsable={false}>
            <Animated.View style={[styles.zoomLayer, zoom.style]}>
              <Image
                source={{ uri: imageFile.path }}
                style={styles.image}
                contentFit="contain"
                transition={150}
              />
            </Animated.View>
          </View>
        </GestureDetector>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <Action icon="share-outline" label="Share" onPress={handleShare} />

          <Action
            icon={file.isFavorite ? "heart" : "heart-outline"}
            label="Favorite"
            color={file.isFavorite ? COLORS.favorite : "#000"}
            onPress={handleFavorite}
          />

          <Action
            icon="trash-outline"
            label="Delete"
            color= "#ef4444"
            onPress={handleDelete}
          />
        </View>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  title: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  imageWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  zoomLayer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "98%",
  },
  bottomBar: {
    height: 64,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  actionItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },

  actionLabel: {
    marginTop: 4,
    fontSize: 14,
    color: "#464646",
  },
});
