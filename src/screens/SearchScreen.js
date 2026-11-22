import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import { searchFiles } from "../db/files";

import { useAdOnScreen } from "../ads/useAdOnScreen";
import { openFile } from "../utils/openFile";
import { formatDate as formatDateShared } from "../utils/dateFormater";

export default function SearchResultsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("All");
  const [query, setQuery] = useState("");
  const [onlyFavorite, setOnlyFavorite] = useState(false);
  const [onlyMarked, setOnlyMarked] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 400);

  const filters = ["All", "PDFs", "Images", "Links"];

  useEffect(() => {
    handleSearch();
  }, [debouncedQuery, activeTab, onlyFavorite, onlyMarked]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await searchFiles(
        debouncedQuery,
        activeTab,
        onlyFavorite,
        onlyMarked,
      );
      setResults(data);
    } catch (err) {
      console.log("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };
  function useDebounce(value, delay = 400) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebounced(value);
      }, delay);

      return () => clearTimeout(handler);
    }, [value]);

    return debounced;
  }

  const renderIcon = (type) => {
    if (type === "pdf")
      return { name: "document-text", bg: "#FEE2E2", color: "#EF4444" };
    if (type === "image")
      return { name: "image", bg: "#DCFCE7", color: "#22C55E" };
    return { name: "link", bg: "#E0E7FF", color: "#4F46E5" };
  };

  const formatDate = (timestamp) => formatDateShared(timestamp);

  const getFileSize = async (path) => {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        const mb = (info.size / (1024 * 1024)).toFixed(2);
        return `${mb} MB`;
      }
    } catch {}
    return "";
  };

  useAdOnScreen();

  const renderItem = ({ item }) => {
    const icon = renderIcon(item.type);

    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => {
          openFile(item, navigation);
        }}
      >
        <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name} size={22} color={icon.color} />
        </View>

        <View style={styles.resultText}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {highlightMatch(item.name, debouncedQuery)}
          </Text>
          <Text style={styles.resultSubtitle}>
            {formatDate(item.createdAt)}
          </Text>
          <View style={styles.folderRow}>
            <Ionicons
              name="folder"
              size={18}
              color="#6366F1"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.folderText}>
              {item.folderName || "No Folder"}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };
  const highlightMatch = (text, keyword) => {
    if (!keyword) return <Text>{text}</Text>;

    const regex = new RegExp(`(${keyword})`, "gi");
    const parts = text.split(regex);

    return (
      <Text>
        {parts.map((part, index) =>
          part.toLowerCase() === keyword.toLowerCase() ? (
            <Text key={index} style={{ backgroundColor: "#FEF08A" }}>
              {part}
            </Text>
          ) : (
            <Text key={index}>{part}</Text>
          ),
        )}
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <Text style={styles.pageTitle}>Search</Text>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={28} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search files..."
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {filters.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        <TouchableOpacity
          style={[styles.filterBtn, onlyFavorite && styles.activeFilter]}
          onPress={() => setOnlyFavorite(!onlyFavorite)}
        >
          <Ionicons
            name={onlyFavorite ? "star" : "star-outline"}
            size={16}
            color={onlyFavorite ? "#fff" : "#4F46E5"}
          />
          <Text style={[styles.filterText, onlyFavorite && { color: "#fff" }]}>
            Favorites
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, onlyMarked && styles.activeFilter]}
          onPress={() => setOnlyMarked(!onlyMarked)}
        >
          <Ionicons
            name={onlyMarked ? "checkmark-circle" : "checkmark-circle-outline"}
            size={16}
            color={onlyMarked ? "#fff" : "#4F46E5"}
          />
          <Text style={[styles.filterText, onlyMarked && { color: "#fff" }]}>
            Marked
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" />
      ) : results.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="search" size={50} color="#c7d2fe" />
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      ) : (
        <View>
          <Text style={styles.resultCount}>
            {results.length} result{results.length !== 1 ? "s" : ""}
          </Text>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginTop: 10,
    marginBottom: 8,
  },
  /* ---------- SEARCH BAR ---------- */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#111827",
  },

  /* ---------- TABS ---------- */
  tabs: {
    flexDirection: "row",
    marginTop: 16,
    marginBottom: 12,
  },

  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    marginRight: 8,
  },

  activeTab: {
    backgroundColor: "#4F46E5",
  },

  tabText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },

  activeTabText: {
    color: "#FFFFFF",
  },

  /* ---------- RESULT CARD ---------- */
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 10,
    width: "98%",
    margin: "auto",
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  resultText: {
    flex: 1,
  },

  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  resultSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  /* ---------- EMPTY STATE ---------- */
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },

  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#9CA3AF",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
  },

  activeFilter: {
    backgroundColor: "#4F46E5",
  },

  filterText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#4F46E5",
    fontWeight: "500",
  },

  resultCount: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  folderText: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "500",
  },
});
