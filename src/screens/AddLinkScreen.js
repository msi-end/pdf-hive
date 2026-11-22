import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { addFile } from "../db/files";
import { showToast } from "../components/CustomToast";


export default function AddPdfLinkScreen({ navigation, route }) {
  const [fileName, setFileName] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);
  const { folderId } = route.params;

  const isValidPdfUrl = (url) => {
    try {
      const parsed = new URL(url);
      return (
        parsed.protocol.startsWith("http") 
      );
    } catch {
      return false;
    }
  };

  const handleSaveLink = async () => {
    if (!fileName.trim()) {
      showToast({ message: "File name is required", type: "error" });
      return;
    }

    if (!pdfUrl.trim()) {
      showToast({ message: "PDF URL is required", type: "error" });
      return;
    }

    if (!isValidPdfUrl(pdfUrl)) {
      showToast({
        message: "Please enter a valid direct PDF link",
        type: "error",
      });
      return;
    }

    try {
      await addFile({
        name: fileName.trim(),
        type: "link",
        path: pdfUrl.trim(),
        folderId,
        isFavorite: 0,
        lastOpenedPage: null,
      });

      showToast({
        message: "PDF link added successfully",
        type: "success",
      });

      navigation.goBack();
    } catch (error) {
      showToast({
        message: error.message || "Failed to save link",
        type: "error",
      });
    }
  };

  // // Dummy folders
  // const folders = [
  //   { id: 1, name: "Mathematics" },
  //   { id: 2, name: "Physics" },
  //   { id: 3, name: "Chemistry" },
  // ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add PDF Link</Text>
        </View>

        {/* Import Info */}
        <Text style={styles.sectionTitle}>IMPORT DOCUMENT</Text>
        <Text style={styles.sectionDesc}>
          Organize your academic resources by linking directly to online PDF
          materials.
        </Text>

        {/* File Name */}
        <Text style={styles.label}>File Name</Text>
        <TextInput
          placeholder="e.g., Organic Chemistry Notes"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          value={fileName}
          onChangeText={setFileName}
        />

        {/* PDF URL */}
        <Text style={styles.label}>PDF URL</Text>
        <TextInput
          placeholder="https://university.edu/lecture1.pdf"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          value={pdfUrl}
          onChangeText={setPdfUrl}
          autoCapitalize="none"
        />

        <View style={styles.infoRow}>
          <Ionicons name="information-circle" size={16} color="#4f46e5" />
          <Text style={styles.infoText}>
            Only valid direct PDF links are supported.
          </Text>
        </View>

        {/* Select Folder */}
        {/* <Text style={styles.label}>Select Folder</Text>
        <TouchableOpacity style={styles.dropdown}>
          <Text style={styles.dropdownText}>
            {selectedFolder || "Choose a destination folder"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity> */}

        {/* Upload Placeholder */}
        <View style={styles.uploadBox}>
          <Ionicons name="cloud-upload-outline" size={36} color="#9CA3AF" />
          <Text style={styles.uploadText}>
            App will automatically index your PDF for easy searching once saved.
          </Text>
        </View>
      </ScrollView>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveLink}>
        <Ionicons name="save-outline" size={20} color="#FFFFFF" />
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 12,
    color: "#111827",
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4f46e5",
    marginBottom: 6,
    letterSpacing: 1,
  },
  sectionDesc: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
    lineHeight: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  infoText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#374151",
  },

  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 32,
  },
  dropdownText: {
    fontSize: 15,
    color: "#111827",
  },

  uploadBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
  },
  uploadText: {
    marginTop: 12,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },

  saveButton: {
    bottom: 100,
    width: "90%",
    alignSelf: "center",  
    backgroundColor: "#4f46e5",
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
