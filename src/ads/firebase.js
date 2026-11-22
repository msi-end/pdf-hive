// remoteConfig.js
import remoteConfig from '@react-native-firebase/remote-config';

// Set up default values
remoteConfig().setDefaults({
  ads_enabled: true,
  ad_type: 'interstitial',
  max_ads_per_day: 5,
  max_ads_per_session: 2,
  randomize_ads: true,
  ad_probability: 70,
  app_open_enabled: true,
  app_open_daily_limit: 3,
});

// Optional: Dev settings to allow frequent fetches
remoteConfig().setConfigSettings({
  minimumFetchIntervalMillis: 43200000, // fetch anytime in dev
  fetchTimeoutMillis: 10000, // 10 sec timeout
});
  
export const initRemoteAdsConfig = async () => {
  try {
    const activated = await remoteConfig().fetchAndActivate();
    console.log('Remote Config Activated:', activated);

    // Log all remote values
    const adsEnabled = remoteConfig().getValue('ads_enabled').asBoolean();
    const adType = remoteConfig().getValue('ad_type').asString();
    const maxPerDay = remoteConfig().getValue('max_ads_per_day').asNumber();
    const maxPerSession = remoteConfig().getValue('max_ads_per_session').asNumber();
    const randomize = remoteConfig().getValue('randomize_ads').asBoolean();
    const adProbability = remoteConfig().getValue('ad_probability').asNumber();
    const appOpenEnabled = remoteConfig().getValue('app_open_enabled').asBoolean();
    const appOpenDailyLimit = remoteConfig().getValue('app_open_daily_limit').asNumber();

    console.log({
      adsEnabled,
      adType,
      maxPerDay,
      maxPerSession,
      randomize,
      adProbability,
      appOpenEnabled,
      appOpenDailyLimit,
    });

    return {
      adsEnabled,
      adType,
      maxPerDay,
      maxPerSession,
      randomize,
      adProbability,
      appOpenEnabled,
      appOpenDailyLimit,
    };
  } catch (e) {
    console.log('Remote Config Fetch Error:', e);
    return null;
  }
};

// Helper functions
export const getRemoteBoolean = (key) => remoteConfig().getValue(key).asBoolean();
export const getRemoteNumber = (key) => remoteConfig().getValue(key).asNumber();
export const getRemoteString = (key) => remoteConfig().getValue(key).asString();