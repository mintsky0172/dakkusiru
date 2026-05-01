import { Stack } from "expo-router";
import { useAppFonts } from "../hooks/useAppFonts";
import { View, ActivityIndicator } from "react-native";
import { colors } from "../constants/colors";
import { useAuthStore } from "../store/authStore";
import { useEffect } from "react";

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    initializeAuth().then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      unsubscribe?.();
    }
  }, [initializeAuth]);

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
