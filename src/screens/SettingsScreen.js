import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as StoreReview from "expo-store-review";
import * as MailComposer from "expo-mail-composer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";

export default function SettingsScreen({ navigation }) {
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [storageUsed, setStorageUsed] = useState("0 MB");
  const [appVersion, setAppVersion] = useState(Application.nativeApplicationVersion || "2.6.2");

  useEffect(() => {
    calculateStorage();
  }, []);

  const calculateStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stores = await AsyncStorage.multiGet(keys);

      const totalSize = stores.reduce((acc, curr) => {
        return acc + (curr[1]?.length || 0);
      }, 0);

      const sizeInMB = (totalSize / 1024 / 1024).toFixed(2);
      setStorageUsed(`${sizeInMB} MB`);
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
        {/* Data Management */}
        {/* <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="cloud-upload" size={20} color="#4f46e5" />
              </View>
              <View>
                <Text style={styles.rowText}>Backup & Restore</Text>
                <Text style={styles.subText}>Last sync: 2 hours ago</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View> */}

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
