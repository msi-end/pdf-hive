import {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

const INTERSTITIAL_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : "ca-app-pub-6476459310344533/8019807113";

const REWARDED_ID = __DEV__
  ? TestIds.REWARDED
  : "ca-app-pub-6476459310344533/4000166479";

// Give up if an ad hasn't loaded in this time, so callers never hang
const LOAD_TIMEOUT_MS = 8000;

/**
 * Load an ad and show it as soon as it's ready.
 * Resolves true if the ad was shown, false if it failed or timed out.
 * Gating (limits / probability) is done by the caller (useAdOnScreen).
 */
const loadAndShow = (ad, { loadedEvent = AdEventType.LOADED, extraListeners = [] } = {}) =>
  new Promise((resolve) => {
    let shown = false;
    let settled = false;
    const unsubscribers = [];

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribers.forEach((u) => u());
      resolve(result);
    };

    const timer = setTimeout(() => {
      if (!shown) finish(false);
    }, LOAD_TIMEOUT_MS);

    unsubscribers.push(
      ad.addAdEventListener(loadedEvent, () => {
        if (settled) return;
        shown = true;
        clearTimeout(timer);
        ad.show().catch(() => finish(false));
      }),
      ad.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log("Ad error:", error);
        finish(false);
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => finish(true)),
      ...extraListeners.map(([type, cb]) => ad.addAdEventListener(type, cb)),
    );

    ad.load();
  });

// ===============================
// Interstitial Ad
// ===============================
export const showInterstitialAd = () =>
  loadAndShow(InterstitialAd.createForAdRequest(INTERSTITIAL_ID));

// ===============================
// Rewarded Ad
// ===============================
// Rewarded ads emit RewardedAdEventType.LOADED (not AdEventType.LOADED)
export const showRewardedAd = () =>
  loadAndShow(RewardedAd.createForAdRequest(REWARDED_ID), {
    loadedEvent: RewardedAdEventType.LOADED,
    extraListeners: [
      [
        RewardedAdEventType.EARNED_REWARD,
        (reward) => console.log("User earned reward:", reward),
      ],
    ],
  });
