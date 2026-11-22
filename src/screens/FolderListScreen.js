import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import CreateFolderSheet from "../components/createFolderSheet";
import {
  getFolders,
  createFolder,
  deleteFolder,
  renameFolder,
  toggleMarkedFolder,
} from "../db/folders";
import { showToast } from "../components/CustomToast";
import OptionsSheet from "../components/OptionsSheet";
import RenameFolderSheet from "../components/sheets/renameFolder";
import { formatDate } from "../utils/dateFormater";

import { useAdOnScreen } from "../ads/useAdOnScreen";

export default function FoldersScreen({ navigation, route }) {
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showRename, setShowRename] = useState(false);
  const [isMarked, setIsMarked] = useState(folders?.isMarked === 1);

  useEffect(() => {
    loadFolders();
  }, []);

  // Opened from the Home screen "+" button
  useEffect(() => {
    if (route?.params?.openCreateFolder) {
      setShowCreateFolder(true);
      navigation.setParams({ openCreateFolder: undefined });
    }
  }, [route?.params?.openCreateFolder]);
  const loadFolders = async () => {
    try {
      const data = await getFolders();
      setFolders(data);
      console.log("Loaded folders:", data);
    } catch (err) {
      console.log("Failed to load folders", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = [...folders];
    if (searchQuery.trim()) {
      result = result.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    return result;
  }, [folders, searchQuery]);

  const formatLastOpened = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();

    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const updateFolderInUI = (id, changes) => {
    setFolders((prev) =>
      prev.map((folder) =>
        folder.id === id ? { ...folder, ...changes } : folder,
      ),
    );
  };

  useAdOnScreen();

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.message}>Loading folders...</Text>
        </View>
      );
    }

    if (!folders.length) {
      return (
        <View style={styles.center}>
          <Ionicons name="folder-open-outline" size={60} color="#c7d2fe" />
          <Text style={styles.message}>No folders found</Text>
          <Text style={styles.subMessage}>
            Tap the "+" button to create your first folder
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate("FolderDetails", {
                folderId: item.id,
                folderName: item.name,
                createdAt: item.createdAt,
              })
            }
          >
            <TouchableOpacity
              onPress={async () => {
                const newValue = item.isMarked ? 0 : 1;
                try {
                  await toggleMarkedFolder(item.id, newValue);
                  updateFolderInUI(item.id, { isMarked: newValue });
                } catch (e) {
                  console.log(e);

                  showToast({
                    message: "Failed to update mark",
                    type: "error",
                  });
                }
              }}
              style={{
                position: "absolute",
                top: "40%",
                right: 10,
                padding: 2,
              }}
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

            {/* Top Row */}
            <View style={styles.topRow}>
              <View style={styles.iconBox}>
                <Ionicons name="folder" size={40} color={item.color} />
              </View>

              <TouchableOpacity
                onPress={() => {
                  setSelectedItem(item);
                  setShowOptions(true);
                }}
                hitSlop={10}
                style={{
                  position: "absolute",
                  top: 0,
                  right: "-5%",
                  padding: 2,
                }}
              >
                <Ionicons name="ellipsis-vertical" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Folder Name */}
            <Text style={styles.folderName} numberOfLines={1}>
              {item.name}
            </Text>

            {/* Bottom Row */}
            <View style={styles.bottomRow}>
              <Text style={styles.fileCount}>
                {item.files} {item.files === 1 ? "File" : "Files"}
              </Text>

              <Text style={styles.lastOpened}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Organizer</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={22} color="#4338ca" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#6366f1" />
        <TextInput
          placeholder="Search your folders..."
          placeholderTextColor="#6366f1"
          style={styles.searchInput}
          onChangeText={(e) => {
            setSearchQuery(e);
          }}
        />
      </View>

      {/* Main Content */}
      {renderContent()}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateFolder(true)}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Folder Creation Sheet */}
      <CreateFolderSheet
        visible={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreate={async (folder) => {
          try {
            await createFolder(folder.name, folder.color);
            setShowCreateFolder(false);
            loadFolders();
          } catch (err) {
            showToast({
              message: `Failed: ${err.message || err}`,
              type: "error",
            });
            console.log("Failed to create folder:", err);
          }
        }}
      />
      <OptionsSheet
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        onEdit={() => {
          setShowOptions(false);
          setShowRename(true);
        }}
        onDelete={async (folder) => {
          setShowOptions(false);
          Alert.alert(
            "Delete Folder?",
            "All files inside this folder will be permanently deleted.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  try {
                    await deleteFolder(selectedItem.id);
                    loadFolders();
                  } catch (error) {
                    alert("Failed to delete folder");
                  }
                },
              },
            ],
          );
        }}
      />
      <RenameFolderSheet
        visible={showRename}
        initialName={selectedItem?.name}
        initialColor={selectedItem?.color}
        onClose={() => setShowRename(false)}
        onSave={async ({ name, color }) => {
          try {
            await renameFolder(selectedItem.id, name, color);
            setShowRename(false);
            loadFolders();
            showToast({ message: "Folder renamed" });
          } catch (e) {
            console.log(e);
            showToast({ message: "Rename failed", type: "error" });
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8fb",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  filterBtn: {
    backgroundColor: "#e0e7ff",
    padding: 10,
    borderRadius: 20,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 20,
    paddingHorizontal: 15,
    borderRadius: 14,
    height: 52,
  },
  searchInput: {
    marginLeft: 10,
    fontSize: 16,
    flex: 1,
  },

  grid: {
    paddingHorizontal: 14,
    paddingBottom: 120,
  },

  // Folder card
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    paddingBottom: 8,
    width: "45%", // for 2-column grid
    margin: 8,
    elevation: 2,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  iconBox: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: "#eef2ff",
    justifyContent: "center",
    alignItems: "center",
  },

  folderName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 10,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },

  fileCount: {
    fontSize: 13,
    color: "#6366f1",
    fontWeight: "500",
  },

  lastOpened: {
    fontSize: 11,
    color: "#9ca3af",
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
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
});
