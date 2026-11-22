import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Pdf from "react-native-pdf";
import * as Sharing from "expo-sharing";
import { showAppOpenAd } from "../ads/appOpenManager";
import { useIsFocused } from "@react-navigation/native";
import { updateLastOpenedPage } from "../db/pdfProgress";

import {
  getFileById,
  toggleFavorite,
  deleteFile,
  toggleMarked,
} from "../db/files";

export default function PdfReaderScreen({ route, navigation }) {
  const { fileId } = route.params;

  const [file, setFile] = useState(null);
  const [page, setPage] = useState(1);
  const [initialPage, setInitialPage] = useState(1);
  const [darkMode, setDarkMode] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isMarked, setIsMarked] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const pdfRef = useRef(null);

  useEffect(() => {
    loadPdf();
  }, []);

  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) {
      showAppOpenAd();
    }
  }, [isFocused]);

  const loadPdf = async () => {
    const f = await getFileById(fileId);
    setFile(f);
    setPage(f?.lastOpenedPage || 1);
    setInitialPage(f?.lastOpenedPage || 1);
    setIsFavorite(f?.isFavorite === 1);
    setIsMarked(f?.isMarked === 1);
  };

  const handleShare = async () => {
    await Sharing.shareAsync(file.path);
  };

  const handleDelete = async () => {
    Alert.alert(
      "Delete PDF?",
      "This cannot be undone. PDF will be deleted permanently",
      [
        { text: "Cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteFile(file.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleFavorite = async () => {
    const newValue = isFavorite ? 0 : 1;
    await toggleFavorite(file.id, newValue);
    setIsFavorite(!isFavorite);
  };

  const handleMarked = async () => {
    await toggleMarked(file.id, !isMarked);
    setIsMarked(!isMarked);
  };

  if (!file) return null;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: darkMode ? "#000" : "#fff" }}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="chevron-back"
            size={26}
            color={darkMode ? "#fff" : "#000"}
          />
        </TouchableOpacity>

        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            marginHorizontal: 10,
            color: darkMode ? "#fff" : "#000",
          }}
        >
          {file.name}
        </Text>

        <TouchableOpacity onPress={() => setDarkMode(!darkMode)}>
          <Ionicons
            name={darkMode ? "moon" : "sunny"}
            size={22}
            color={darkMode ? "#fff" : "#000"}
          />
        </TouchableOpacity>
      </View>

      {/* PDF VIEW */}
      <Pdf
        ref={pdfRef}
        source={{
          uri: file.path.startsWith("file://")
            ? file.path
            : `file://${file.path}`,
        }}
        style={{ flex: 1 }}
        page={initialPage}
        enablePaging={false}
        horizontal={false}
        enableAntialiasing={true}
        spacing={4}
        trustAllCerts={false}
        onLoadComplete={(numberOfPages) => {
          setTotalPages(numberOfPages);
        }}
        onPageChanged={(p) => {
          setPage(p);
          updateLastOpenedPage(fileId, p).catch((e) =>
            console.log("Failed to save page:", e),
          );
        }}
        onError={(error) => console.log("PDF ERROR:", error)}
      />

      {/* PAGE INDICATOR */}
      <View style={styles.pageIndicator}>
        <TouchableOpacity
          disabled={page === 1}
          onPress={() => {
            const newPage = page - 1;
            pdfRef.current.setPage(newPage);
            setPage(newPage);
          }}
        >
          <Ionicons name="caret-back-circle" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.pageText}>
          {page} / {totalPages}
        </Text>

        <TouchableOpacity
          disabled={page === totalPages}
          onPress={() => {
            const newPage = page + 1;
            pdfRef.current.setPage(newPage);
            setPage(newPage);
          }}
        >
          <Ionicons name="caret-forward-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* BOTTOM ACTION BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={22} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleMarked}>
          <Ionicons
            name={
              isMarked
                ? "checkmark-done-circle"
                : "checkmark-done-circle-outline"
            }
            size={22}
            color={isMarked ? "#30880d" : "#000"}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleFavorite}>
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={22}
            color={isFavorite ? "#ef4444" : "#000"}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  pageIndicator: {
    position: "absolute",
    bottom: 110,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  pageText: {
    color: "#fff",
    fontWeight: "600",
  },
});
