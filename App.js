import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator from "./src/navigation/RootNavigator";
import { initDatabase } from "./src/db";
import CustomToast from "./src/components/CustomToast";
import mobileAds from "react-native-google-mobile-ads";
import { initAppOpenAds } from "./src/ads/appOpenManager";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function App() {
  const [dbReady, setDbReady] = useState(false);

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

  // ✅ Conditional render AFTER all hooks
  if (!dbReady) {
    return null; // Splash screen if you want
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
        <CustomToast />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
