import { useEffect } from "react";
import { useIsFocused } from "@react-navigation/native";
import { loadAdsConfig, shouldShowAd } from "./AdsManager"; // updated Remote Config helper
import { showInterstitialAd, showRewardedAd } from "./AdController"; // updated ad controller

let lastAdTime = 0;
const COOLDOWN_MS = 0; // 30 seconds between ads

export const useAdOnScreen = () => {
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;

    const tryShowAd = async () => {
      const now = Date.now();

      // Cooldown check
      if (now - lastAdTime < COOLDOWN_MS) return;

      // Load Remote Config + Ads settings
      const config = await loadAdsConfig();

      // Check daily/session limit + probability
      const allowed = await shouldShowAd(config);
      console.log({ allowed, config });
      if (!allowed) return;

      lastAdTime = now;

      // Show ad based on type 
      if (config.type === "rewarded") {
        await showRewardedAd();
      } else {
        await showInterstitialAd();
        
      }
     await allowed()
    };

    tryShowAd();
  }, [isFocused]);
};