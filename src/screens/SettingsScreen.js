import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Share,
  Platform,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as StoreReview from "expo-store-review";
import * as MailComposer from "expo-mail-composer";
import { useFocusEffect } from "@react-navigation/native";
import { getStorageUsed } from "../db/files";
import { formatSize } from "../utils/dateFormater";
import * as Application from "expo-application";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createBackup,
  restoreBackup,
  pickBackupFile,
  estimateBackupSize,
} from "../db/backup";
import { formatDate } from "../utils/dateFormater";
import { showToast } from "../components/CustomToast";
import { suppressAppOpenAd } from "../ads/appOpenManager";

const LAST_BACKUP_KEY = "last_backup_at";
// Above this, warn that the backup may be slow or too big for the phone's memory
const LARGE_BACKUP_BYTES = 300 * 1024 * 1024;

export default function SettingsScreen({ navigation }) {
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [storageUsed, setStorageUsed] = useState("0 MB");
  const [lastBackupAt, setLastBackupAt] = useState(null);
  // { title, detail } while a backup / restore is running
  const [busy, setBusy] = useState(null);
  const [appVersion, setAppVersion] = useState(Application.nativeApplicationVersion || "2.6.2");

  // Recalculate whenever the tab is opened (files may have changed)
  useFocusEffect(
    useCallback(() => {
      calculateStorage();
      AsyncStorage.getItem(LAST_BACKUP_KEY)
        .then((v) => setLastBackupAt(v ? Number(v) : null))
        .catch(() => {});
    }, []),
  );

  // ---------- Backup & restore ----------
  const runExport = async () => {
    setBusy({ title: "Creating backup…", detail: "Getting ready" });
    try {
      const result = await createBackup(({ stage, current, total }) =>
        setBusy({
          title: "Creating backup…",
          detail:
            stage === "packing"
              ? `Adding file ${current} of ${total}`
              : "Saving backup file",
        }),
      );
      setBusy(null);

      const now = Date.now();
      setLastBackupAt(now);
      AsyncStorage.setItem(LAST_BACKUP_KEY, String(now)).catch(() => {});

      if (result.missing) {
        showToast({
          message: `${result.missing} file(s) were missing on this phone and were skipped`,
          type: "error",
          duration: 4000,
        });
      }

      // Saving to Drive etc. can take a while; don't show an ad on return
      suppressAppOpenAd(10 * 60 * 1000);
      await Sharing.shareAsync(result.uri, {
        mimeType: "application/zip",
        dialogTitle: "Save your PDF Hive backup",
        UTI: "public.zip-archive",
      });
      suppressAppOpenAd(5000);
    } catch (e) {
      setBusy(null);
      showToast({ message: e.message || "Backup failed", type: "error" });
    }
  };

  const handleExport = async () => {
    try {
      const { bytes, files, folders } = await estimateBackupSize();
      if (!files && !folders) {
        showToast({ message: "There's nothing to back up yet.", type: "error" });
        return;
      }
      const summary = `${folders} folder${folders === 1 ? "" : "s"} and ${files} file${
        files === 1 ? "" : "s"
      } (about ${formatSize(bytes) === "—" ? "0 KB" : formatSize(bytes)}).`;
      Alert.alert(
        "Export backup",
        `This saves ${summary}\n\nYou can then save the .zip to Google Drive, Files, email or anywhere else.` +
          (bytes > LARGE_BACKUP_BYTES
            ? "\n\nYour library is large, so this may take a few minutes."
            : ""),
        [
          { text: "Cancel", style: "cancel" },
          { text: "Export", onPress: runExport },
        ],
      );
    } catch (e) {
      showToast({ message: "Backup failed", type: "error" });
    }
  };

  const runRestore = async (file) => {
    setBusy({ title: "Restoring backup…", detail: "Reading backup file" });
    try {
      const r = await restoreBackup(file.uri, ({ stage, current, total }) =>
        setBusy({
          title: "Restoring backup…",
          detail:
            stage === "reading"
              ? "Reading backup file"
              : `Restoring file ${current} of ${total}`,
        }),
      );
      setBusy(null);
      calculateStorage();

      const parts = [`${r.filesAdded} file${r.filesAdded === 1 ? "" : "s"} restored`];
      if (r.foldersAdded) parts.push(`${r.foldersAdded} new folder${r.foldersAdded === 1 ? "" : "s"}`);
      if (r.skipped) parts.push(`${r.skipped} already in your library`);
      if (r.failed) parts.push(`${r.failed} couldn't be restored`);
      Alert.alert("Restore complete", parts.join("\n"));
    } catch (e) {
      setBusy(null);
      Alert.alert("Restore failed", e.message || "Something went wrong.");
    }
  };

  const handleRestore = async () => {
    try {
      suppressAppOpenAd(10 * 60 * 1000);
      const file = await pickBackupFile();
      suppressAppOpenAd(5000);
      if (!file) return;
      Alert.alert(
        "Restore from backup?",
        `Folders and files from "${file.name}" will be added to your library.\n\nNothing you have now is deleted, and files that are already here are skipped.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Restore", onPress: () => runRestore(file) },
        ],
      );
    } catch (e) {
      showToast({ message: "Couldn't open the file picker", type: "error" });
    }
  };

  // Size of the PDFs and images stored in the app
  const calculateStorage = async () => {
    try {
      const { bytes } = await getStorageUsed();
      setStorageUsed(bytes ? formatSize(bytes) : "0 MB");
    } catch (error) {
      console.log("Storage error", error);
    }
  };

  const handleRateApp = async () => {
    if (await StoreReview.hasAction()) {
      StoreReview.requestReview();
    } else {
      Linking.openURL(
        "https://play.google.com/store/apps/details?id=com.reyone.PDFOrganizer",
      );
    }
  };

  const handleShare = async () => {
    try {
      // Dynamically get your package name (Android) or Bundle ID (iOS)
      const identifier = Application.applicationId;
      const playStoreLink = `https://play.google.com/store/apps/details?id=${identifier}`;

      const message = `Manage your PDFs easily with PDFOrganizer! 📄\n\nDownload it here: ${playStoreLink}`;

      const result = await Share.share({
        message: message, // Android uses this for both text and link
        url: playStoreLink, // iOS uses this to show a link preview
        title: "Check out PDFOrganizer",
      });

      if (result.action === Share.sharedAction) {
        console.log("Shared successfully");
      }
    } catch (error) {
      console.error("Error sharing:", error.message);
    }
  };

  const handleFeedback = async () => {
    MailComposer.composeAsync({
      recipients: ["info.reynrel+PDFHive@gmail.com"],
      subject: "PDF Hive : A PDFOrganizer - Feedback",
    });
  };

  const handleUpgrade = () => {
    Alert.alert("Upgrade to Pro", "Unlock unlimited folders & remove ads.", [
      { text: "Cancel", style: "cancel" },
      { text: "Upgrade", onPress: () => console.log("Implement IAP") },
    ]);
  };

  const openPrivacy = () => {
    Linking.openURL("https://reynrel.in/apps/pdfhive/privacy");
  };

  const openTerms = () => {
    Linking.openURL("https://reynrel.in/apps/pdfhive/terms");
  };

  return (
    <ScrollView>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          {/* <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#111827" />
          </TouchableOpacity> */}
          {/* <Text style={styles.headerTitle}>Settings</Text> */}
          {/* <View style={{ width: 26 }} /> */}
        </View>
        {/* App Info */}
        <View style={styles.appSection}>
          <View style={styles.appIcon}>
            <Image
              source={require("../../assets/logo-bg-removed.png")}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.appName}>PDF Hive</Text>
          <Text style={styles.appDesc}>Academic PDF Organizer</Text>
        </View>
        {/* Appearance */}
        {/* <Text style={styles.sectionTitle}>APPEARANCE</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="moon" size={20} color="#4f46e5" />
              </View>
              <Text style={styles.rowText}>Dark Mode</Text>
            </View>
            <Switch value={darkMode} onValueChange={setDarkMode} />
          </View> 
        </View> */}

        {/* Security */}
        {/* <Text style={styles.sectionTitle}>SECURITY</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="lock-closed" size={20} color="#4f46e5" />
              </View>
              <Text style={styles.rowText}>App Lock</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View> */}
        {/* Backup & Restore */}
        <Text style={styles.sectionTitle}>BACKUP & RESTORE</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleExport}>
            <View style={[styles.rowLeft, { flex: 1 }]}>
              <View style={styles.iconBox}>
                <Ionicons name="cloud-upload" size={20} color="#4f46e5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>Export backup</Text>
                <Text style={styles.subText}>
                  {lastBackupAt
                    ? `Last backup: ${formatDate(lastBackupAt, true)}`
                    : "Save all folders and files as a .zip"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={handleRestore}>
            <View style={[styles.rowLeft, { flex: 1 }]}>
              <View style={styles.iconBox}>
                <Ionicons name="cloud-download" size={20} color="#4f46e5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>Restore from backup</Text>
                <Text style={styles.subText}>
                  Add folders and files from a backup .zip
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>INFO</Text>
        <View style={styles.card}>
          {/* <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="person" size={20} color="#4f46e5" />
              </View>
              <Text style={styles.rowText}>Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity> */}

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="analytics" size={20} color="#4f46e5" />
              </View>
              <Text style={styles.rowText}>Storage Used</Text>
            </View>
            <Text style={styles.version}>{storageUsed}</Text>
          </View>
        </View>

        {/* <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="notifications" size={20} color="#4f46e5" />
              </View>
              <Text style={styles.rowText}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
            />
          </View>
        </View> */}

        {/* <Text style={styles.sectionTitle}>PREMIUM</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleUpgrade}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="diamond" size={20} color="#f59e0b" />
              </View>
              <Text
                style={[
                  styles.rowText,
                  { color: "#f59e0b", fontWeight: "600" },
                ]}
              >
                Upgrade to Pro
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View> */}

        {/* SUPPORT */}
        <Text style={styles.sectionTitle}>SUPPORT</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleRateApp}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="star" size={20} color="#4f46e5" />
              </View>
              <Text style={styles.rowText}>Rate App</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={handleShare}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="share-social" size={20} color="#4f46e5" />
              </View>
              <Text style={styles.rowText}>Share App</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={handleFeedback}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons
                  name="chatbubble-ellipses"
                  size={20}
                  color="#4f46e5"
                />
              </View>
              <Text style={styles.rowText}>Send Feedback</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* LEGAL */}
        <Text style={styles.sectionTitle}>LEGAL</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={openPrivacy}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="shield-checkmark" size={20} color="#4f46e5" />
              </View>
              <Text style={styles.rowText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={openTerms}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="document-lock" size={20} color="#4f46e5" />
              </View>
              <Text style={styles.rowText}>Terms & Conditions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="git-branch" size={20} color="#4f46e5" />
              </View>
              <Text style={styles.rowText}>App Version</Text>
            </View>
            <Text style={styles.version}>v2.6.2</Text>
          </View>
        </View>
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>MADE FOR STUDENTS</Text>
          <View style={styles.footerIcons}>
            <Ionicons name="school" size={18} color="#9CA3AF" />
            <Ionicons name="book" size={18} color="#9CA3AF" />
            <Ionicons name="document-text" size={18} color="#9CA3AF" />
          </View>
          <Text style={[styles.footerText, { marginTop: 10, fontSize: 11 }]}>
            made with 💖 by reynrel.in
          </Text>
        </View>
      </SafeAreaView>

      {/* Backup / restore progress */}
      <Modal visible={!!busy} transparent animationType="fade">
        <View style={styles.busyBackdrop}>
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.busyTitle}>{busy?.title}</Text>
            <Text style={styles.busyDetail}>{busy?.detail}</Text>
            <Text style={styles.busyHint}>Please keep the app open.</Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    justifyContent: "space-evenly",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  appSection: {
    alignItems: "center",
    marginVertical: 20,
  },
  appIcon: {
    width: 130,
    height: 100,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  logo: {
    width: 140,
    height: 140,
    backgroundColor: "#ffffff00",
    padding: 20,
    borderRadius: 30,
  },
  appIconBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
  },
  appName: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 12,
  },
  appDesc: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    marginHorizontal: 16,
    marginTop: 28,
    marginBottom: 8,
    letterSpacing: 1,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  busyBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  busyBox: {
    width: "80%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  busyTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  busyDetail: {
    marginTop: 6,
    fontSize: 14,
    color: "#4f46e5",
    fontWeight: "600",
  },
  busyHint: {
    marginTop: 10,
    fontSize: 12,
    color: "#9CA3AF",
  },
  subText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  version: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginLeft: 68,
  },

  footer: {
    alignItems: "center",
    marginVertical: 30,
  },
  footerText: {
    fontSize: 12,
    letterSpacing: 2,
    color: "#9CA3AF",
    marginBottom: 10,
  },
  footerIcons: {
    flexDirection: "row",
    gap: 16,
  },
});
