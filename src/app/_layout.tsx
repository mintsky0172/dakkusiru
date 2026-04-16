import { Stack } from "expo-router";
import { useAppFonts } from "../hooks/useAppFonts";
import { View, ActivityIndicator } from "react-native";
import { colors } from "../constants/colors";

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background.base,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <ActivityIndicator color={colors.text.primary} />
      </View>
    )
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="editor/index" />
      <Stack.Screen name="saved/index" />
      <Stack.Screen name="settings/index" />
    </Stack>
  );
}
