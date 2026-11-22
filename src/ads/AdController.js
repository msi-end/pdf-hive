import mobileAds, {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  TestIds,
} from "react-native-google-mobile-ads";
import { loadAdsConfig, shouldShowAd } from "./AdsManager"; // updated remote config helper

let interstitial = null;

// ===============================
// Interstitial Ad
// ===============================
export const showInterstitialAd = async () => {
  const config = await loadAdsConfig();
  const canShow = await shouldShowAd(config);

  // if (!canShow) {
  //   console.log("Interstitial ad not allowed by Remote Config or daily/session limit");
  //   return;
  // }

  if (!interstitial) {
    interstitial = InterstitialAd.createForAdRequest(
      __DEV__ ? TestIds.INTERSTITIAL : "ca-app-pub-6476459310344533/8019807113",
      { requestNonPersonalizedAdsOnly: false },
    );
  }

  return new Promise((resolve) => {
    const unsubscribeLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        interstitial.show();
      },
    );

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      resolve(true);
    });

    interstitial.load();
  });
};


// ===============================
// Rewarded Interstitial Ad
// ===============================
export const showRewardedAd = async () => {
  const config = await loadAdsConfig();
  const canShow = await shouldShowAd(config);

  if (!canShow) {
    console.log("Rewarded ad not allowed by Remote Config or daily/session limit");
    return;
  }

  const rewarded = RewardedAd.createForAdRequest(
    __DEV__ ? TestIds.REWARDED_INTERSTITIAL : "ca-app-pub-6476459310344533/4000166479",
  );

  return new Promise((resolve) => {
    const unsubscribeLoaded = rewarded.addAdEventListener(AdEventType.LOADED, () => {
      rewarded.show();
    });

    const unsubscribeReward = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        console.log("User earned reward:", reward);
      },
    );

    const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribeLoaded();
      unsubscribeReward();
      unsubscribeClosed();
      resolve(true);
    });

    rewarded.load();
  });
};