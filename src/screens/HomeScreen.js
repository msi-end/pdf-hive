import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";

import { getRecentFiles, getFavoriteFiles, toggleFavorite } from "../db/files";
import { useAdOnScreen } from "../ads/useAdOnScreen";

export default function HomeScreen({ navigation }) {
  const [showSheet, setShowSheet] = useState(false);
  const [recentFiles, setRecentFiles] = useState([]);
  const [favoriteFiles, setFavoriteFiles] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
 useAdOnScreen();
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      loadRecent();
    }, []),
  );
  const loadRecent = async () => {
    try {
      const data = await getRecentFiles(10);
      setRecentFiles(data);
    } catch (err) {
      console.log("Failed to load recent:", err);
    }
  };

  const loadFavorites = async () => {
    try {
      const data = await getFavoriteFiles();
      setFavoriteFiles(data);
    } catch (err) {
      console.log("Failed to load favorites:", err);
    }
  };
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };
  const openFile = (item, navigation) => {
    if (item.type === "image") {
      navigation.navigate("ImageViewer", {
        // files: imageFiles, // pass all images in folder
        // index: imageIndexMap[item.id],
        fileId: item.id,
      });
    }

    if (item.type === "pdf") {
      navigation.navigate("PdfReader", { fileId: item.id });
    }

    if (item.type === "link") {
      Linking.openURL(item.path);
    }
  };

  return (
    // <SafeAreaView style={styles.container}>
    <View style={styles.container}>
      {/* Header */}
      <ScrollView>
        <LinearGradient
          colors={["#6C63FF", "#4B46E5"]}
          style={styles.containerHeader}
        >
          {/* Top Icons */}
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
              <Ionicons name="settings" size={22} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity>
              <Ionicons name="ellipsis-horizontal" size={35} color="#fff" />
            </TouchableOpacity>
          </View>
          ``
          {/* Greeting */}
          <Text style={styles.smallText}>Hello, Student</Text>
          <Animated.Text
            style={[
              styles.greeting,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
              styles.bigText,
            ]}
          >
            {getGreeting()},
          </Animated.Text>
          {/* Search Bar */}
          <TouchableOpacity
            style={styles.searchBox}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Search")}
          >
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#6b6b6b" />
              <Text style={styles.searchInput}>Search PDFs, images, links</Text>
            </View>
          </TouchableOpacity>
          {/* <Text
            style={[styles.smallText, { fontSize: 12, textAlign: "center" }]}
          >
            lore10ada agadg adfg ag ad g ad ads ss
          </Text> */}
        </LinearGradient>

        {/* Recent Files */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Files</Text>
          {/* <Text style={styles.viewAll}>View All</Text> */}
        </View>
        {recentFiles.length === 0 ? (
          <View style={styles.emptyRecent}>
            <Ionicons name="document-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyRecentText}>No recent files yet</Text>
          </View>
        ) : (
          <FlatList
            horizontal
            data={recentFiles}
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20 }}
            renderItem={({ item }) => {
              const getIcon = () => {
                if (item.type === "pdf") return "document-text";
                if (item.type === "image") return "image";
                return "link";
              };

              return (
                <TouchableOpacity
                  style={styles.recentCard}
                  onPress={() => openFile(item, navigation)}
                >
                  {/* File Icon */}
                  <View style={styles.recentIconBox}>
                    <Ionicons name={getIcon()} size={54} color="#4F46E5" />
                  </View>

                  {/* File Name */}
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {item.name}
                  </Text>

                  {/* Folder */}
                  <View style={styles.folderRowSmall}>
                    <Ionicons name="folder" size={16} color="#6366F1" />
                    <Text style={styles.folderSmallText}>
                      {" "}
                      - {item.folderName || "No Folder"}
                    </Text>
                  </View>

                  {/* Date */}
                  <Text style={styles.recentTime}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
        {/* Favorite Files */}
        <Text style={[styles.sectionTitle, { marginLeft: 20, marginTop: 20 }]}>
          Favorite Files
        </Text>
        {favoriteFiles.length === 0 ? (
          <View style={styles.emptyFavorite}>
            <Ionicons name="heart-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyFavoriteText}>No favorite files yet</Text>
          </View>
        ) : (
          favoriteFiles.map((item) => (
            <TouchableOpacity onPress={() => openFile(item, navigation)}>
              <View key={item.id} style={styles.favoriteItem}>
                <View style={styles.favoriteLeft}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name={
                        item.type === "pdf"
                          ? "document-text"
                          : item.type === "image"
                            ? "image"
                            : "link"
                      }
                      size={20}
                      color="#4f46e5"
                    />
                  </View>
                  <View>
                    <Text
                      style={styles.favoriteTitle}
                      ellipsizeMode="tail"
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.favoriteSubtitle}>
                      {item.folderName || "No Folder"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={async () => {
                    await toggleFavorite(item.id, 0);
                    loadFavorites();
                  }}
                  style={{ marginLeft: 10 }}
                >
                  <Ionicons name="heart" size={20} color="#e54696e1" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Floating Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate("Folders", {
            screen: "FoldersHome",
            params: { openCreateFolder: true },
          })
        }
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
    // </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8fb",
  },
  containerHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 40,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    marginBottom: 20,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    alignItems: "center",
  },
  smallText: {
    color: "#e0e0e0",
    fontSize: 18,
    marginBottom: 4,
  },
  bigText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
    color: "#333",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "600",
  },
  bell: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 20,
  },

  searchBox: {
    flexDirection: "row",
    backgroundColor: "#fff",
    margin: 15,
    borderRadius: 12,
    paddingHorizontal: 5,
    alignItems: "center",
  },
  searchInput: {
    marginLeft: 10,
    flex: 1,
    height: 20,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  viewAll: {
    color: "#4f46e5",
    fontWeight: "600",
  },

  recentIconBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  folderRowSmall: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  emptyRecent: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },
  emptyRecentText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "500",
  },
  recentCard: {
    width: 150,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginRight: 15,
    padding: 10,
    elevation: 2,
    marginBottom: 2,
  },
  recentImage: {
    width: "100%",
    height: 110,
    borderRadius: 12,
  },
  recentTitle: {
    marginTop: 8,
    fontWeight: "600",
  },
  recentTime: {
    fontSize: 12,
    color: "#777",
  },

  favoriteItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    elevation: 1,
  },
  favoriteLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#eef2ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  favoriteTitle: {
    fontWeight: "600",
    width: 220,
  },
  favoriteSubtitle: {
    fontSize: 12,
    color: "#666",
  },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#4f46e5",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },

  bottomTab: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    backgroundColor: "#fff",
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  emptyFavorite: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },

  emptyFavoriteText: {
    marginTop: 10,
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});
