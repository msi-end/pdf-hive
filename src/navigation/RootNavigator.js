import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SplashScreen from '../screens/SplashScreen';
import BottomTabs from "./BottomTabs";
import PdfReaderScreen from "../screens/PdfReaderScreen";
import ImageViewerScreen from "../screens/ImageViewerScreen";
import FolderDetailsScreen from "../screens/FolderDetailScreen";
import AddLinkScreen from "../screens/AddLinkScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator  initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      {/* Splash Screen */}
      <Stack.Screen name="Splash" component={SplashScreen} />
      {/* Tabs */}
      <Stack.Screen name="MainApp" component={BottomTabs} />

      {/* Full screen pages (no bottom tab) */}
      <Stack.Screen name="FolderDetails" component={FolderDetailsScreen} />
      <Stack.Screen name="AddLinkScreen" component={AddLinkScreen} />
      <Stack.Screen name="PdfReader" component={PdfReaderScreen} />
      <Stack.Screen name="ImageViewer" component={ImageViewerScreen} />
    </Stack.Navigator>
  );
}
