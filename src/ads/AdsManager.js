import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  initRemoteAdsConfig,
  getRemoteBoolean,
  getRemoteNumber,
  getRemoteString,
} from "./firebase";

let sessionCount = 0;

export const loadAdsConfig = async () => {
  const remoteValues = await initRemoteAdsConfig();
  return {
    enabled: remoteValues?.adsEnabled ?? true,
    type: remoteValues?.adType ?? "interstitial",
    maxPerDay: remoteValues?.maxPerDay ?? 5,
    maxPerSession: remoteValues?.maxPerSession ?? 2,
    randomize: remoteValues?.randomize ?? true,
    probability: remoteValues?.adProbability ?? 70,
  };
};


/**
 *  Decide if we should show an ad
 */
export const shouldShowAd = async (config) => {
   
  // 1️⃣ Global enable check
  if (!config.enabled) {
    console.log("Ads disabled globally");
    return false;
  }

  // 2️⃣ Session limit
  if (sessionCount >= config.maxPerSession) {
    console.log("Session limit reached:", sessionCount, "/", config.maxPerSession);
    return false;
  }

  // 3️⃣ Daily limit
  const today = new Date().toDateString();
  const stored = await AsyncStorage.getItem("daily_ads");
  let data = stored ? JSON.parse(stored) : { date: today, count: 0 };

  if (data.date !== today) {
    data = { date: today, count: 0 };
  }

  if (data.count >= config.maxPerDay) {
    console.log("Daily limit reached:", data.count, "/", config.maxPerDay);
    return false;
  }

  // 4️⃣ Random probability
  if (config.randomize) {
    const rand = Math.floor(Math.random() * 100); // 0-99
    if (rand >= config.probability) {
      console.log("Ad skipped due to probability check:", rand, ">=", config.probability);
      return false;
    }
  }

  // 5️⃣ Return a function to mark the ad as shown
  const markAdShown = async () => {
    sessionCount++;
    data.count++;
    await AsyncStorage.setItem("daily_ads", JSON.stringify(data));
    console.log("Ad shown — sessionCount:", sessionCount, "dailyCount:", data.count);
  };

  return markAdShown; // Caller must call this after the ad actually shows
};