import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Pdf from "react-native-pdf";
import * as Sharing from "expo-sharing";
import * as Linking from "expo-linking";
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [isMarked, setIsMarked] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [loadError, setLoadError] = useState(null);
  const pdfRef = useRef(null);

  const isLink = file?.type === "link";

  useEffect(() => {
    loadPdf();
  }, []);

  const loadPdf = async () => {
    const f = await getFileById(fileId);
    if (!f) {
      Alert.alert("Error", "File not found", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
      return;
    }
    setFile(f);
    setPage(f.lastOpenedPage || 1);
    setInitialPage(f.lastOpenedPage || 1);
    setIsFavorite(f.isFavorite === 1);
    setIsMarked(f.isMarked === 1);
  };

  const getSource = () => {
    if (isLink) return { uri: file.path, cache: true };
    return {
      uri: file.path.startsWith("file://") ? file.path : `file://${file.path}`,
    };
  };

  const handleShare = async () => {
    try {
      if (isLink) {
        await Share.share({ message: file.path });
      } else {
        await Sharing.shareAsync(file.path, { mimeType: "application/pdf" });
      }
    } catch {
      Alert.alert("Error", "Unable to share file");
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      isLink ? "Delete link?" : "Delete PDF?",
      isLink
        ? "This link will be removed from your library."
        : "This cannot be undone. PDF will be deleted permanently",
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

  const goToPage = (newPage) => {
    if (newPage < 1 || (totalPages && newPage > totalPages)) return;
    pdfRef.current?.setPage(newPage);
    setPage(newPage);
  };

  if (!file) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.title}>
          {file.name}
        </Text>

        {isLink && (
          <TouchableOpacity onPress={() => Linking.openURL(file.path)}>
            <Ionicons name="open-outline" size={22} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      {/* PDF VIEW */}
      {loadError ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
          <Text style={styles.errorTitle}>Couldn't open this PDF</Text>
          <Text style={styles.errorText}>
            {isLink
              ? "The link may not point directly to a PDF, or you may be offline."
              : "The file may be damaged or missing."}
          </Text>
          {isLink && (
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => Linking.openURL(file.path)}
            >
              <Text style={styles.errorButtonText}>Open in browser</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Pdf
          ref={pdfRef}
          source={getSource()}
          style={{ flex: 1 }}
          page={initialPage}
          enablePaging={false}
          horizontal={false}
          enableAntialiasing={true}
          spacing={4}
          trustAllCerts={false}
          renderActivityIndicator={() => (
            <ActivityIndicator size="large" color="#4f46e5" />
          )}
          onLoadComplete={(numberOfPages) => {
            setTotalPages(numberOfPages);
          }}
          onPageChanged={(p) => {
            setPage(p);
            updateLastOpenedPage(fileId, p).catch((e) =>
              console.log("Failed to save page:", e),
            );
          }}
          onError={(error) => {
            console.log("PDF ERROR:", error);
            setLoadError(error);
          }}
        />
      )}

      {/* PAGE INDICATOR */}
      {!loadError && totalPages > 0 && (
        <View style={styles.pageIndicator}>
          <TouchableOpacity
            disabled={page <= 1}
            onPress={() => goToPage(page - 1)}
          >
            <Ionicons name="caret-back-circle" size={28} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.pageText}>
            {page} / {totalPages}
          </Text>

          <TouchableOpacity
            disabled={page >= totalPages}
            onPress={() => goToPage(page + 1)}
          >
            <Ionicons name="caret-forward-circle" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

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
  title: {
    flex: 1,
    marginHorizontal: 10,
    color: "#000",
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
  errorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  errorText: {
    marginTop: 6,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  errorButton: {
    marginTop: 18,
    backgroundColor: "#4f46e5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
