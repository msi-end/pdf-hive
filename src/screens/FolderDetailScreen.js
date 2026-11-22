import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AddFileSheet from "../components/AddFileSheet";
import {
  getFilesByFolder,
  toggleFavorite,
  toggleMarked,
  deleteFile,
  deleteFiles,
  renameFile,
  moveFiles,
} from "../db/files";

import { importPdfs } from "../db/pdfImport";
import { importImage } from "../db/imageImport";

import { showToast } from "../components/CustomToast";
import OptionsSheet from "../components/sheets/OptionsSheetFile";
import FolderPickerSheet from "../components/sheets/FolderPickerSheet";
import SortMenu, { SortButton } from "../components/SortMenu";
import RenameFileSheet from "../components/sheets/RenameFileSheet";
import { formatDate, formatSize } from "../utils/dateFormater";
import { openFile } from "../utils/openFile";
import { COLORS } from "../constants/colors";

const TABS = ["All", "PDFs", "Images", "Links"];

const SORT_STORAGE_KEY = "folder_sort";
const SORT_OPTIONS = [
  { key: "newest", label: "Newest first", icon: "arrow-down" },
  { key: "oldest", label: "Oldest first", icon: "arrow-up" },
  { key: "name_asc", label: "Name (A–Z)", icon: "text" },
  { key: "name_desc", label: "Name (Z–A)", icon: "text" },
  { key: "size_desc", label: "Largest first", icon: "resize" },
  { key: "opened", label: "Recently opened", icon: "time" },
];

const sortFiles = (files, key) => {
  const byName = (a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  const sorted = [...files];
  switch (key) {
    case "oldest":
      return sorted.sort((a, b) => a.createdAt - b.createdAt);
    case "name_asc":
      return sorted.sort(byName);
    case "name_desc":
      return sorted.sort((a, b) => byName(b, a));
    case "size_desc":
      return sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
    case "opened":
      // Opened files first (most recent on top), never-opened at the end
      return sorted.sort(
        (a, b) =>
          (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0) ||
          b.createdAt - a.createdAt,
      );
    case "newest":
    default:
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
  }
};

const getFileIcon = (type) => {
  switch (type) {
    case "pdf":
      return { name: "document-text", color: "#6366f1" };
    case "image":
      return { name: "image", color: "#6366f1" };
    case "link":
      return { name: "link", color: "#6366f1" };
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

  const [refreshing, setRefreshing] = useState(false);

  // Sorting
  const [sortKey, setSortKey] = useState("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState([]);
  const selectionMode = selectedIds.length > 0;

  // Move to folder: list of file ids being moved (null = picker closed)
  const [moveIds, setMoveIds] = useState(null);
  const [moving, setMoving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFiles();
    }, []),
  );

  // Restore the saved sort order
  useEffect(() => {
    AsyncStorage.getItem(SORT_STORAGE_KEY)
      .then((value) => {
        if (value && SORT_OPTIONS.some((o) => o.key === value)) {
          setSortKey(value);
        }
      })
      .catch(() => {});
  }, []);

  // Android back button leaves selection mode first
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (selectedIds.length > 0) {
          setSelectedIds([]);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [selectedIds.length]),
  );

  const loadFiles = async () => {
    try {
      setRefreshing(true);
      const data = await getFilesByFolder(folderId);
      setFiles(data);
      // Drop selections for files that no longer exist
      setSelectedIds((prev) =>
        prev.filter((id) => data.some((f) => f.id === id)),
      );
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

    return sortFiles(result, sortKey);
  }, [files, searchQuery, activeTab, sortKey]);

  const currentSort = SORT_OPTIONS.find((o) => o.key === sortKey);

  const chooseSort = (key) => {
    setSortKey(key);
    setShowSortMenu(false);
    AsyncStorage.setItem(SORT_STORAGE_KEY, key).catch(() => {});
  };

  const toggleSearch = () => {
    setIsSearching(!isSearching);
    if (isSearching) setSearchQuery(""); // Clear search when closing
  };

  const updateFileInUI = (id, changes) => {
    setFiles((prev) =>
      prev.map((file) => (file.id === id ? { ...file, ...changes } : file)),
    );
  };
  const removeFilesFromUI = (ids) => {
    setFiles((prev) => prev.filter((file) => !ids.includes(file.id)));
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
  };

  // ---------- Selection ----------
  const toggleSelected = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((f) => selectedIds.includes(f.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((f) => f.id));
    }
  };

  const handleRowPress = (item) => {
    if (selectionMode) {
      toggleSelected(item.id);
    } else {
      openFile(item, navigation);
      // reflect "opened" immediately (clears unread dot)
      updateFileInUI(item.id, { lastOpenedAt: Date.now() });
    }
  };

  const handleRowLongPress = (item) => {
    if (!selectionMode) setSelectedIds([item.id]);
    else toggleSelected(item.id);
  };

  // ---------- Bulk actions ----------
  const confirmDelete = (ids) => {
    if (!ids.length) return;
    const many = ids.length > 1;
    Alert.alert(
      many ? `Delete ${ids.length} files?` : "Delete File?",
      many
        ? "These files will be permanently deleted."
        : "This file will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (many) await deleteFiles(ids);
              else await deleteFile(ids[0]);
              removeFilesFromUI(ids);
              showToast({
                message: many ? `${ids.length} files deleted` : "File deleted",
                type: "success",
              });
            } catch (error) {
              showToast({ message: "Failed to delete", type: "error" });
              loadFiles();
            }
          },
        },
      ],
    );
  };

  const handleMoveTo = async (folder) => {
    if (!moveIds?.length || moving) return;
    setMoving(true);
    try {
      await moveFiles(moveIds, folder.id);
      removeFilesFromUI(moveIds);
      showToast({
        message:
          moveIds.length > 1
            ? `Moved ${moveIds.length} files to ${folder.name}`
            : `Moved to ${folder.name}`,
        type: "success",
      });
      setMoveIds(null);
    } catch (e) {
      showToast({ message: e.message || "Failed to move", type: "error" });
    } finally {
      setMoving(false);
    }
  };

  // ---------- Header ----------
  const renderHeader = () => {
    if (selectionMode) {
      return (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedIds([])}>
            <Ionicons name="close" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text style={styles.selectionTitle}>
            {selectedIds.length} selected
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity
              onPress={toggleSelectAll}
              style={styles.iconButton}
            >
              <Ionicons
                name={allVisibleSelected ? "checkbox" : "checkbox-outline"}
                size={22}
                color="#4f46e5"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMoveIds(selectedIds)}
              style={styles.iconButton}
            >
              <Ionicons name="folder-open-outline" size={22} color="#4f46e5" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => confirmDelete(selectedIds)}
              style={styles.iconButton}
            >
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#4f46e5" />
        </TouchableOpacity>
        {isSearching ? null : (
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {folderName}
            </Text>
            <Text style={styles.headerSubtitle}>
              {files.length} {files.length === 1 ? "file" : "files"} • Created{" "}
              {formatDate(createdAt)}
            </Text>
          </View>
        )}
        <View
          style={[styles.headerContainer, isSearching && styles.headerSearching]}
        >
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
                value={searchQuery}
                onChangeText={(text) => setSearchQuery(text)}
              />
              <TouchableOpacity onPress={toggleSearch}>
                <Ionicons name="close-circle" size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={toggleSearch} style={styles.iconButton}>
              <Ionicons name="search" size={22} color="#4f46e5" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ---------- Row ----------
  const renderItem = ({ item }) => {
    const isSelected = selectedIds.includes(item.id);
    const icon = getFileIcon(item.type);

    return (
      <TouchableOpacity
        style={[styles.fileRow, isSelected && styles.fileRowSelected]}
        activeOpacity={0.7}
        onPress={() => handleRowPress(item)}
        onLongPress={() => handleRowLongPress(item)}
        delayLongPress={300}
      >
        <View style={styles.fileLeft}>
          <View style={styles.iconWrapper}>
            <View style={styles.fileIcon}>
              {selectionMode ? (
                <Ionicons
                  name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                  size={32}
                  color={isSelected ? "#4f46e5" : "#c7d2fe"}
                />
              ) : (
                <Ionicons name={icon.name} size={35} color={icon.color} />
              )}
            </View>
            {/* Unread: never opened */}
            {!selectionMode && !item.lastOpenedAt && (
              <View style={styles.unreadDot} />
            )}
          </View>

          <View style={styles.textContent}>
            <Text style={styles.fileName} numberOfLines={1}>
              {item.name}
            </Text>

            <Text style={styles.fileMeta}>
              Created: {formatDate(item.createdAt)}
              {item.type !== "link" ? ` • ${formatSize(item.size)}` : ""}
            </Text>
            {!!item.lastOpenedAt && (
              <Text style={styles.lastOpened}>
                Last opened: {formatDate(item.lastOpenedAt, true)}
              </Text>
            )}
          </View>
        </View>

        {!selectionMode && (
          <>
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
                  color={item.isFavorite ? COLORS.favorite : "#d1d5db"}
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
                  color={item.isMarked ? COLORS.success : "#d1d5db"}
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
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {renderHeader()}

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

        {/* Sort bar */}
        <View style={styles.sortBar}>
          <Text style={styles.countText}>
            {filtered.length} {filtered.length === 1 ? "item" : "items"}
          </Text>
          <SortButton
            label={currentSort?.label}
            onPress={() => setShowSortMenu(true)}
          />
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
          extraData={selectedIds}
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
                  Tap the "+" button to add your first file
                </Text>
              </View>
            ) : null
          }
          renderItem={renderItem}
        />

        {/* Floating Add Button */}
        {!selectionMode && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowSheet(true)}
          >
            <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Add file sheet */}
        <AddFileSheet
          visible={showSheet}
          onClose={() => setShowSheet(false)}
          onImportPdf={async () => {
            try {
              const result = await importPdfs(folderId);
              if (!result) {
                console.log("User cancelled document picker");
                return;
              }
              const { imported, failed } = result;
              showToast({
                message:
                  imported.length === 1
                    ? `Imported ${imported[0].name}`
                    : `Imported ${imported.length} PDFs` +
                      (failed.length ? ` (${failed.length} failed)` : ""),
                type: failed.length ? "error" : "success",
              });
              loadFiles();
              setShowSheet(false);
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

        {/* Per-file options */}
        <OptionsSheet
          visible={showOptions}
          onClose={() => setShowOptions(false)}
          onEdit={() => {
            setShowOptions(false);
            setShowRename(true);
          }}
          onMove={() => {
            setShowOptions(false);
            setMoveIds([selectedItem.id]);
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
            confirmDelete([selectedItem.id]);
          }}
        />

        {/* Move to folder */}
        <FolderPickerSheet
          visible={!!moveIds}
          onClose={() => !moving && setMoveIds(null)}
          title={
            moveIds?.length > 1
              ? `Move ${moveIds.length} files to`
              : "Move to folder"
          }
          excludeFolderId={folderId}
          onSelect={handleMoveTo}
          busy={moving}
        />

        {/* Sort menu */}
        <SortMenu
          visible={showSortMenu}
          onClose={() => setShowSortMenu(false)}
          options={SORT_OPTIONS}
          value={sortKey}
          onChange={chooseSort}
        />

        <RenameFileSheet
          visible={showRename}
          file={selectedItem}
          onClose={() => setShowRename(false)}
          onSave={async (name) => {
            try {
              await renameFile(selectedItem.id, name);
              updateFileInUI(selectedItem.id, { name });
              setShowRename(false);
              showToast({ message: "File renamed", type: "success" });
            } catch {
              showToast({ message: "Failed to rename file", type: "error" });
            }
          }}
        />
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
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 1,
  },
  headerContainer: {
    height: 50,
    justifyContent: "center",
  },
  headerSearching: {
    flex: 1,
    marginLeft: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
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
    backgroundColor: COLORS.primary,
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


  /* Selection mode */
  selectionTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  selectionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fileRowSelected: {
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },

  /* Sort */
  sortBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  countText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
});
