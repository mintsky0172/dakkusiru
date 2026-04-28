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
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.text.primary} />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="new"
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="editor/[id]"
        options={{
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
