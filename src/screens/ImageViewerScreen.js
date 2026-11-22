import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getFileById, toggleFavorite, deleteFile } from "../db/files";

import { showAppOpenAd } from "../ads/appOpenManager";
import { useIsFocused } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

export default function ImageViewerScreen({ route, navigation }) {
  const { fileId } = route.params;

  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);

  const isFocused = useIsFocused();

  useEffect(() => {
    loadImage();
  }, []);

  useEffect(() => {
    if (isFocused) {
      showAppOpenAd();
    }
  }, [isFocused]);

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
            // remove from filesystem if local
            if (file.type !== "link") {
              await FileSystem.deleteAsync(file.path, {
                idempotent: true,
              });
            }

            // remove from DB
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

          <Ionicons name="ellipsis-horizontal" size={22} color="#111" />
        </View>

        {/* Image */}
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: imageFile.path }}
            style={styles.image}
            contentFit="contain"
            transition={150}
          />
        </View>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <Action icon="share-outline" label="Share" onPress={handleShare} />

          <Action
            icon={file.isFavorite ? "heart" : "heart-outline"}
            label="Favorite"
            color={file.isFavorite ? "#d6249b" : "#000"}
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
