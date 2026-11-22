import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FolderListScreen from "../screens/FolderListScreen";


const Stack = createNativeStackNavigator();

export default function FolderStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FoldersHome" component={FolderListScreen} />
    </Stack.Navigator>
  );
}