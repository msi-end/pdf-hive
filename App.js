import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator from "./src/navigation/RootNavigator";
import { initDatabase } from "./src/db";
import CustomToast from "./src/components/CustomToast";
import IncomingPdfHandler from "./src/components/IncomingPdfHandler";
import mobileAds from "react-native-google-mobile-ads";
import { initAppOpenAds, showAppOpenAd } from "./src/ads/appOpenManager";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Give an incoming "Open with" link a moment to arrive (and suppress the ad)
const APP_OPEN_AD_DELAY_MS = 600;
// Ignore short trips out of the app (file picker, camera, share sheet)
const MIN_BACKGROUND_MS = 30 * 1000;

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const backgroundedAt = useRef(null);

  // 1️⃣ Initialize Database
  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        setDbReady(true);
      } catch (error) {
        console.error("DB init failed:", error);
      }
    })();
  }, []);

  // 2️⃣ Initialize AdMob (ALWAYS runs, safe)
  useEffect(() => {
    mobileAds()
      .initialize()
      .then(() => {
        console.log("AdMob Initialized");
        initAppOpenAds();
      });
  }, []);

  // 3️⃣ App-open ads: only when the user returns to the app from background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "background") {
        backgroundedAt.current = Date.now();
      } else if (next === "active" && backgroundedAt.current) {
        const away = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (away >= MIN_BACKGROUND_MS) {
          setTimeout(() => showAppOpenAd(), APP_OPEN_AD_DELAY_MS);
        }
      }
    });
    return () => sub.remove();
  }, []);

  // ✅ Conditional render AFTER all hooks
  if (!dbReady) {
    return null; // Splash screen if you want
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
        <IncomingPdfHandler />
        <CustomToast />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
