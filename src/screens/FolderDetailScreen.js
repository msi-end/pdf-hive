import React, { useState, useEffect, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AddFileSheet from "../components/AddFileSheet";
import {
  getFilesByFolder,
  toggleFavorite,
  toggleMarked,
  deleteFile,
  renameFile,
} from "../db/files";

import { importPdf } from "../db/pdfImport";
import { importImage } from "../db/imageImport";
import * as Linking from "expo-linking";

import { showToast } from "../components/CustomToast";
import OptionsSheet from "../components/sheets/OptionsSheetFile";
import { formatDate, formatSize } from "../utils/dateFormater";

const TABS = ["All", "PDFs", "Images", "Links"];
const getFileIcon = (type) => {
  switch (type) {
    case "pdf":
      return { name: "document-text", color: "#6366f1" }; // red
    case "image":
      return { name: "image", color: "#6366f1" }; // green
    case "link":
      return { name: "link", color: "#6366f1" }; // indigo
    default:
      return { name: "document", color: "#4f46e5" };
  }
};

export default function FolderDetailsScreen({ navigation, route }) {
  const { folderId, folderName, createdAt } = route.params;
  const [activeTab, setActiveTab] = useState("All");
  const [showSheet, setShowSheet] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState(null);
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState("");

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadFiles();
    }, []),
  );
  const loadFiles = async () => {
    try {
      setRefreshing(true);
      const data = await getFilesByFolder(folderId);
      setFiles(data);
    } catch (err) {
      console.log("Failed to load files", err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = [...files];

    if (searchQuery.trim()) {
      result = result.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (activeTab !== "All") {
      result = result.filter(
        (f) => f.type.toLowerCase() === activeTab.toLowerCase().slice(0, -1),
      );
    }

    return result;
  }, [files, searchQuery, activeTab]);

  const toggleSearch = () => {
    setIsSearching(!isSearching);
    if (isSearching) setSearchQuery(""); // Clear search when closing
  };

  const updateFileInUI = (id, changes) => {
    setFiles((prev) =>
      prev.map((file) => (file.id === id ? { ...file, ...changes } : file)),
    );
  };
  const removeFileFromUI = (id) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
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
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#4f46e5" />
          </TouchableOpacity>
          {isSearching ? null : (
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{folderName}</Text>
              <Text style={styles.headerSubtitle}>
                {formatDate(createdAt, true)}
              </Text>
            </View>
          )}
          <View style={styles.headerContainer}>
            {isSearching ? (
              <View style={styles.searchBar}>
                <Ionicons
                  name="search"
                  size={20}
                  color="#6366f1"
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Search..."
                  autoFocus={true}
                  m
                  value={searchQuery}
                  onChangeText={(text) => setSearchQuery(text)}
                />
                <TouchableOpacity onPress={toggleSearch}>
                  <Ionicons name="close-circle" size={22} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={toggleSearch}
                style={styles.iconButton}
              >
                <Ionicons name="search" size={22} color="#4f46e5" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={styles.tab}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.message}>Loading files...</Text>
          </View>
        )}

        {/* File List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshing={refreshing}
          onRefresh={loadFiles}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.center}>
                <Ionicons
                  name="folder-open-outline"
                  size={60}
                  color="#c7d2fe"
                />
                <Text style={styles.message}>No files found</Text>
                <Text style={styles.subMessage}>
                  Tap the "+" button to create your first file
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.fileRow}
              activeOpacity={0.7}
              onPress={() => openFile(item, navigation)}
            >
              <View style={styles.fileLeft}>
                {/* Icon Container with Unread Dot */}
                <View style={styles.iconWrapper}>
                  <View style={styles.fileIcon}>
                    {/* const icon = getFileIcon(item.type); */}
                    <Ionicons
                      name={getFileIcon(item.type).name}
                      size={35}
                      color={getFileIcon(item.type).color}
                    />
                  </View>
                  {!item.isRead && <View style={styles.unreadDot} />}
                </View>

                {/* Text Content */}
                <View style={styles.textContent}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {item.name}
                  </Text>

                  {/* Metadata: Created Date and Size */}
                  <Text style={styles.fileMeta}>
                    Created: {formatDate(item.createdAt)} •{" "}
                    {formatSize(item.size)}
                  </Text>
                  {item.lastOpened && (
                    <Text style={styles.lastOpened}>
                      Last opened: {item.lastOpened}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.fileRight}>
                {/* Favorite Toggle */}
                <TouchableOpacity
                  onPress={async () => {
                    const newValue = item.isFavorite ? 0 : 1;
                    try {
                      await toggleFavorite(item.id, newValue);
                      updateFileInUI(item.id, { isFavorite: newValue });
                    } catch (e) {
                      showToast({
                        message: "Failed to update favorite",
                        type: "error",
                      });
                    }
                  }}
                  style={styles.actionButton}
                >
                  <Ionicons
                    name={item.isFavorite ? "heart" : "heart-outline"}
                    size={22}
                    color={item.isFavorite ? "#ef44d2" : "#d1d5db"}
                  />
                </TouchableOpacity>

                {/* Mark as Read Toggle */}
                <TouchableOpacity
                  onPress={async () => {
                    const newValue = item.isMarked ? 0 : 1;
                    try {
                      await toggleMarked(item.id, newValue);
                      updateFileInUI(item.id, { isMarked: newValue });
                    } catch (e) {
                      showToast({
                        message: "Failed to update mark",
                        type: "error",
                      });
                    }
                  }}
                  style={styles.actionButton}
                >
                  <Ionicons
                    name={
                      item.isMarked
                        ? "checkmark-done-circle"
                        : "checkmark-circle-outline"
                    }
                    size={22}
                    color={item.isMarked ? "#10b918" : "#d1d5db"}
                  />
                </TouchableOpacity>
              </View>
              {/* More Options */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setSelectedItem(item);
                  setShowOptions(true);
                }}
              >
                <Ionicons name="ellipsis-vertical" size={26} color="#9ca3af" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />

        {/* Floating Add Button */}
        <TouchableOpacity style={styles.fab} onPress={() => setShowSheet(true)}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
        {/* Bottom Sheet */}
        <AddFileSheet
          visible={showSheet}
          onClose={() => setShowSheet(false)}
          onImportPdf={async () => {
            try {
              const newFile = await importPdf(folderId);
              if (newFile.status == true) {
                showToast({
                  message: `Imported ${newFile.name}`,
                  type: "success",
                });
                loadFiles();
                setShowSheet(false);
              } else {
                console.log("User cancelled document picker");
              }
            } catch (error) {
              showToast({
                message: error.message || "Failed to import PDF",
                type: "error",
              });
            }
          }}
          onAddImage={async () => {
            try {
              const newImage = await importImage({ folderId });

              if (!newImage) {
                console.log("User cancelled image picker");
                return;
              }

              showToast({
                message: `Image added`,
                type: "success",
              });

              loadFiles();
              setShowSheet(false);
            } catch (error) {
              showToast({
                message: error.message || "Failed to add image",
                type: "error",
              });
            }
          }}
          onAddLink={() => {
            setShowSheet(false);
            navigation.navigate("AddLinkScreen", { folderId });
          }}
        />
        <OptionsSheet
          visible={showOptions}
          onClose={() => setShowOptions(false)}
          onEdit={() => {
            setShowOptions(false);
            setNewName(selectedItem.name);
            setShowRename(true);
          }}
          onMark={async () => {
            setShowOptions(false);
            const newValue = selectedItem.isMarked ? 0 : 1;
            try {
              await toggleMarked(selectedItem.id, newValue);
              updateFileInUI(selectedItem.id, { isMarked: newValue });
              showToast({
                message: newValue ? "Marked" : "Unmarked",
                type: "success",
              });
            } catch {
              showToast({ message: "Failed to update mark", type: "error" });
            }
          }}
          onFavorite={async () => {
            setShowOptions(false);
            const newValue = selectedItem.isFavorite ? 0 : 1;
            try {
              await toggleFavorite(selectedItem.id, newValue);
              updateFileInUI(selectedItem.id, { isFavorite: newValue });
            } catch {
              showToast({
                message: "Failed to update favorite",
                type: "error",
              });
            }
          }}
          onDelete={() => {
            setShowOptions(false);

            Alert.alert(
              "Delete File?",
              "This file will be permanently deleted.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteFile(selectedItem.id);

                      removeFileFromUI(selectedItem.id);

                      showToast({
                        message: "File deleted",
                        type: "success",
                      });
                    } catch (error) {
                      showToast({
                        message: "Failed to delete file",
                        type: "error",
                      });
                    }
                  },
                },
              ],
            );
          }}
        />
        {showRename && (
          <View style={styles.renameOverlay}>
            <View style={styles.renameBox}>
              <Text style={styles.renameTitle}>Rename File</Text>

              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Enter new name"
                style={styles.renameInput}
                autoFocus
              />

              <View style={styles.renameActions}>
                <TouchableOpacity onPress={() => setShowRename(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    if (!newName.trim()) return;

                    await renameFile(selectedItem.id, newName.trim());
                    setShowRename(false);
                    loadFiles();
                    showToast({
                      message: "File renamed",
                      type: "success",
                    });
                  }}
                >
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8fb",
    paddingBottom: -25,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerContainer: {
    paddingHorizontal: 16,
    height: 50,
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    width: 300,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
  },
  iconButton: {
    alignSelf: "flex-end", // Keeps it to the right if needed
    padding: 8,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#ffffff",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  tabText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#4f46e5",
  },
  tabIndicator: {
    marginTop: 8,
    height: 3,
    width: 30,
    borderRadius: 2,
    backgroundColor: "#4f46e5",
  },

  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 15,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  fileLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconWrapper: {
    position: "relative",
    marginRight: 12,
  },
  fileIcon: {
    width: 48,
    height: 48,
    backgroundColor: "#f5f7ff",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3b82f6",
    borderWidth: 2,
    borderColor: "#fff",
  },
  textContent: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 1,
  },
  fileMeta: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
  },
  lastOpened: {
    fontSize: 11,
    color: "#6366f1",
    fontWeight: "500",
    marginTop: 2,
  },
  fileRight: {
    flexDirection: "column",
    alignItems: "center",
    height: 60,
    justifyContent: "space-between",
  },
  actionButton: {
    padding: 0,
    marginLeft: 4,
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4f46e5",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "bold",
    color: "#4f46e5",
  },
  subMessage: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },

  renameOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  renameBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  renameTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  renameInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
  },
  renameActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 15,
  },
  cancelText: {
    marginRight: 20,
    color: "#6b7280",
  },
  saveText: {
    color: "#4f46e5",
    fontWeight: "600",
  },
});
