import { Stack } from "expo-router";
import { useAppFonts } from "../hooks/useAppFonts";
import { useAuthStore } from "../store/authStore";
import { useEffect, useRef, useState } from "react";
import AppSplashScreen from "../components/common/AppSplashScreen";
import { useShopPackStore } from "../store/shopPackStore";
import { usePurchaseStore } from "../store/purchaseStore";
import { useCoinStore } from "../store/coinStore";
import { prefetchImageSources } from "../utils/prefetchImageSources";
import { getPackPreviewImageSources } from "../utils/getPackPreviewImageSources";

const SPLASH_PREFETCH_PACK_COUNT = 6;
const SPLASH_PREFETCH_PREVIEW_COUNT = 6;
const SPLASH_PREFETCH_TIMEOUT_MS = 1500;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  const [isBootstrapComplete, setIsBootstrapComplete] = useState(false);
  const [bootstrapProgress, setBootstrapProgress] = useState(0);
  const [progressLabel, setProgressLabel] =
    useState("앱 설정을 준비하는 중...");

  const hasStartedBootstrap = useRef(false);
  const authCleanupRef = useRef<(() => void) | undefined>(undefined);

  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const loadPacks = useShopPackStore((state) => state.loadPacks);
  const loadOwnedPackIds = usePurchaseStore((state) => state.loadOwnedPackIds);
  const loadCoins = useCoinStore((state) => state.loadCoins);

  useEffect(() => {
    if (!fontsLoaded || hasStartedBootstrap.current) return;

    let isMounted = true;
    hasStartedBootstrap.current = true;

    const updateProgress = (progress: number) => {
      if (isMounted) {
        setBootstrapProgress(progress);
      }
    };

    async function bootstrapApp() {
      setProgressLabel("앱 설정을 준비하는 중...");
      updateProgress(0.16);

      const cleanup = await initializeAuth();
      authCleanupRef.current = cleanup;
      setProgressLabel("사용자 정보를 확인하는 중...");
      updateProgress(0.36);

      await Promise.all([loadPacks(), loadOwnedPackIds(), loadCoins()]);
      setProgressLabel("상점 데이터를 불러오는 중...");
      updateProgress(0.68);

      const packs = useShopPackStore
        .getState()
        .packs.slice(0, SPLASH_PREFETCH_PACK_COUNT);
      const prefetchPromise =
        prefetchImageSources([
          ...packs.map((pack) => pack.thumbnailSource),
          ...packs.flatMap((pack) =>
            getPackPreviewImageSources(pack, SPLASH_PREFETCH_PREVIEW_COUNT),
          ),
        ]) ?? Promise.resolve(false);

      await Promise.race([prefetchPromise, wait(SPLASH_PREFETCH_TIMEOUT_MS)]);
      setProgressLabel("거의 다 왔어요...");
      updateProgress(0.94);

      await wait(140);

      if (isMounted) {
        setBootstrapProgress(1);
        setIsBootstrapComplete(true);
      }
    }

    void bootstrapApp().catch(() => {
      if (isMounted) {
        setBootstrapProgress(1);
        setIsBootstrapComplete(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [fontsLoaded, initializeAuth, loadCoins, loadOwnedPackIds, loadPacks]);

  useEffect(() => {
    return () => {
      authCleanupRef.current?.();
    };
  }, []);

  if (!fontsLoaded || !isBootstrapComplete) {
    return <AppSplashScreen progress={bootstrapProgress} label={progressLabel} />;
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
