import {
  AppOpenAd,
  AdEventType,
  TestIds,
} from "react-native-google-mobile-ads";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initRemoteAdsConfig } from "./firebase";

let appOpenAd = null;
let isLoaded = false;

let app_open_enabled = true;
let DAILY_LIMIT = 3;
let suppressUntil = 0;

/**
 * Skip app-open ads for a short time (e.g. when the app was opened
 * to receive a PDF via "Open with").
 */
export const suppressAppOpenAd = (ms = 5000) => {
  suppressUntil = Date.now() + ms;
};

const AD_UNIT_ID = __DEV__
  ? TestIds.APP_OPEN
  : "ca-app-pub-6476459310344533/3952493614";

/**
 * Initialize Remote Config + App Open Ads
 */
export const initAppOpenAds = async () => {
  // 1 Fetch remote config values
  const remoteValues = await initRemoteAdsConfig();

  // 2 Update local variables from fetched values
  if (remoteValues) {
    app_open_enabled = remoteValues.appOpenEnabled ?? true;
    DAILY_LIMIT = remoteValues.appOpenDailyLimit ?? 3;
  }

  console.log("Remote Values:", { app_open_enabled, DAILY_LIMIT });

  // 3 Load ad if enabled
  if (app_open_enabled) {
    loadAppOpenAd();
  }
};

/**
 *  Load App Open Ad
 */
export const loadAppOpenAd = () => {
  if (!app_open_enabled) return;
  if (appOpenAd) return;

  appOpenAd = AppOpenAd.createForAdRequest(AD_UNIT_ID);

  appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
    console.log("App Open Loaded");
    isLoaded = true;
  });

  appOpenAd.addAdEventListener(AdEventType.ERROR, (error) => {
    console.log("Ad failed to load:", error);
    appOpenAd = null;
    isLoaded = false;
  });

  appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
    console.log("App Open Closed");
    isLoaded = false;
    appOpenAd = null;

    setTimeout(() => {
      loadAppOpenAd();
    }, 4000);
  });

  appOpenAd.load();
};

/**
 *  Daily Limit Check
 */
const canShowToday = async () => {
  const today = new Date().toDateString();
  const stored = await AsyncStorage.getItem("app_open_daily");

  let data = stored ? JSON.parse(stored) : {};

  if (data.date !== today) {
    data = { date: today, count: 0 };
  }

  if (data.count >= DAILY_LIMIT) return false;

  data.count++;
  await AsyncStorage.setItem("app_open_daily", JSON.stringify(data));

  return true;
};

/**
 *  Show App Open Ad
 */
export const showAppOpenAd = async () => {
  if (!app_open_enabled) {
    console.log("Ads disabled from Remote Config");
    return;
  }

  if (Date.now() < suppressUntil) {
    console.log("App open ad suppressed");
    return;
  }

  if (!isLoaded || !appOpenAd) {
    console.log("Ad not ready yet");
    loadAppOpenAd();
    return;
  }

  const allowed = await canShowToday();

  if (!allowed) {
    console.log("Daily limit reached");
    return;
  }

  appOpenAd.show();
};
