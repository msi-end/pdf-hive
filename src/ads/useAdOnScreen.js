import { useEffect } from "react";
import { useIsFocused } from "@react-navigation/native";
import { loadAdsConfig, shouldShowAd } from "./AdsManager"; // updated Remote Config helper
import { showInterstitialAd, showRewardedAd } from "./AdController"; // updated ad controller

let lastAdTime = 0;
const COOLDOWN_MS = 60 * 1000; // at least 60 seconds between ads

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
      // (returns a "mark as shown" function when allowed)
      const markAdShown = await shouldShowAd(config);
      if (!markAdShown) return;

      lastAdTime = now;

      // Show ad based on type
      const shown =
        config.type === "rewarded"
          ? await showRewardedAd()
          : await showInterstitialAd();

      // Only count ads that were actually displayed
      if (shown) await markAdShown();
    };

    tryShowAd();
  }, [isFocused]);
};