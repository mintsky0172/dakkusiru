import {
  Alert,
  AppState,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ViewShot from "react-native-view-shot";
import { useEditorStore } from "../store/editorStore";
import { Satellite } from "lucide-react-native";
import {
  loadDakkuByIdFromLocal,
  saveDakkuToLocal,
} from "../services/localDakkuStorage";
import { router, useFocusEffect } from "expo-router";
import { saveCanvasToGallery } from "../utils/saveCanvasToGallery";
import Screen from "../components/common/Screen";
import EditorTopBar from "../components/editor/EditorTopBar";
import EditorCanvas from "../components/editor/EditorCanvas";
import FloatingToolButtons from "../components/editor/FloatingToolButtons";
import StickerPanelSheet from "../components/editor/StickerPanelSheet";
import BackgroundPanelSheet from "../components/editor/BackgroundPanelSheet";
import { pickImageFromLibrary } from "../utils/pickImageFromLibrary";

interface EditorScreenProps {
  mode: "new" | "edit";
  dakkuId?: string;
}

function createDakkuId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const EditorScreen = ({ mode, dakkuId }: EditorScreenProps) => {
  const [isStickerSheetVisible, setIsStickerSheetVisible] = useState(false);
  const [isBackgroundSheetVisible, setIsBackgroundSheetVisible] =
    useState(false);
  const [currentDakkuId, setCurrentDakkuId] = useState<string>(
    dakkuId ?? createDakkuId(),
  );
  const [title, setTitle] = useState("새 다꾸");
  const [hideSelectionUI, setHideSelectionUI] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const canvasRef = useRef<ViewShot>(null);
  const autoSavingRef = useRef(false);

  const background = useEditorStore((state) => state.background);
  const objects = useEditorStore((state) => state.objects);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);

  const addSticker = useEditorStore((state) => state.addSticker);
  const addText = useEditorStore((state) => state.addText);
  const addPhoto = useEditorStore((state) => state.addPhoto);
  const setBackground = useEditorStore((state) => state.setBackground);

  const bringObjectForward = useEditorStore(
    (state) => state.bringObjectForward,
  );
  const sendObjectBackward = useEditorStore(
    (state) => state.sendObjectBackward,
  );

  const setEditorData = useEditorStore((state) => state.setEditorData);
  const resetEditor = useEditorStore((state) => state.resetEditor);

  useEffect(() => {
    async function initializeEditor() {
      if (mode === "new") {
        resetEditor();
        setCurrentDakkuId(createDakkuId());
        setTitle("새 다꾸");
        return;
      }

      if (!dakkuId) return;

      const savedDakku = await loadDakkuByIdFromLocal(dakkuId);

      if (!savedDakku) {
        Alert.alert("불러오기 실패", "저장된 다꾸를 찾을 수 없어요.", [
          {
            text: "확인",
            onPress: () => router.back(),
          },
        ]);
        return;
      }

      setCurrentDakkuId(savedDakku.id);
      setTitle(savedDakku.title);
      setEditorData({
        background: savedDakku.background,
        objects: savedDakku.objects,
      });
    }
    initializeEditor();
  }, [mode, dakkuId, resetEditor, setEditorData]);

  const handleSaveImageToGallery = async () => {
    try {
      const uri = await captureCanvasWithoutSelection();

      if (!uri) {
        throw new Error("캔버스 이미지를 생성하지 못했어요.");
      }

      await saveCanvasToGallery(uri);
      Alert.alert("저장 완료", "사진 앱에 이미지가 저장되었어요.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "이미지를 저장하는 중 오류가 발생했어요.";

      Alert.alert("저장 실패", message);
    }
  };

  const handleSaveDakkuLocally = async ({
    silent = false,
  }: { silent?: boolean } = {}) => {
    try {
      let thumbnailUri: string | undefined;

      try {
        thumbnailUri = await captureCanvasWithoutSelection();
      } catch {
        thumbnailUri = undefined;
      }

      await saveDakkuToLocal({
        id: currentDakkuId,
        title,
        background,
        objects,
        thumbnailUri,
      });

      if (!silent) {
        Alert.alert("저장 완료", "내 다꾸에 저장되었어요.");
      }

      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "다꾸를 저장하는 중 오류가 발생했어요.";

      if (!silent) {
        Alert.alert("저장 실패", message);
      }
      return false;
    }
  };

  const handleBringForward = () => {
    if (!selectedObjectId) return;
    bringObjectForward(selectedObjectId);
  };

  const handleSendBackward = () => {
    if (!selectedObjectId) return;
    sendObjectBackward(selectedObjectId);
  };

  const waitForNextFrame = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

  const captureCanvasWithoutSelection = async () => {
    setHideSelectionUI(true);

    await waitForNextFrame();
    await waitForNextFrame();

    try {
      const uri = await canvasRef.current?.capture?.();

      if (!uri) {
        throw new Error("캔버스 이미지를 생성하지 못했어요.");
      }

      return uri;
    } finally {
      setHideSelectionUI(false);
    }
  };

  const handleGoHomeWithAutoSave = async () => {
    const ok = await saveDakkuSilently();

    if (ok) {
      router.replace("/");
      return;
    }

    Alert.alert(
      "자동 저장 실패",
      "자동 저장에 실패했어요. 그래도 홈으로 이동할까요?",
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "이동",
          style: "destructive",
          onPress: () => router.replace("/"),
        },
      ],
    );
  };

  const saveDakkuSilently = useCallback(async () => {
    if (autoSavingRef.current) return true;

    autoSavingRef.current = true;

    try {
      const ok = await handleSaveDakkuLocally({ silent: true });
      return ok;
    } finally {
      autoSavingRef.current = false;
    }
  }, [handleSaveDakkuLocally]);

  const latestSilentSaveRef = useRef(saveDakkuSilently);

  useEffect(() => {
    latestSilentSaveRef.current = saveDakkuSilently;
  }, [saveDakkuSilently]);

  useFocusEffect(
    useCallback(() => {
      const appStateSubscription = AppState.addEventListener(
        "change",
        (nextState) => {
          if (nextState === "background" || nextState === "inactive") {
            void latestSilentSaveRef.current();
          }
        },
      );

      let backSubscription: { remove: () => void } | undefined;

      if (Platform.OS === "android") {
        backSubscription = BackHandler.addEventListener(
          "hardwareBackPress",
          () => {
            void (async () => {
              const ok = await latestSilentSaveRef.current();

              if (!ok) {
                Alert.alert(
                  "자동 저장 실패",
                  "자동 저장에 실패했어요. 그래도 홈으로 이동할까요?",
                  [
                    { text: "취소", style: "cancel" },
                    {
                      text: "이동",
                      style: "destructive",
                      onPress: () => {
                        if (router.canGoBack()) {
                          router.back();
                        } else {
                          router.replace("/");
                        }
                      },
                    },
                  ],
                );
                return;
              }

              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/");
              }
            })();

            return true;
          },
        );
      }

      return () => {
        appStateSubscription.remove();
        backSubscription?.remove();
      };
    }, []),
  );

  const handleAddPhoto = async () => {
    try {
      const asset = await pickImageFromLibrary();

      if (!asset) return;

      addPhoto({
        uri: asset.uri,
        width: 180,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "사진을 불러오는 중 오류가 발생했어요.";

      Alert.alert("사진 불러오기 실패", message);
    }
  };

  return (
    <Screen padded={false}>
      <View style={styles.container}>
        <EditorTopBar
          onSave={handleSaveImageToGallery}
          onAddText={addText}
          onSaveDakku={handleSaveDakkuLocally}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onGoHome={handleGoHomeWithAutoSave}
          onAddPhoto={handleAddPhoto}
        />

        <View style={styles.canvasArea}>
          <EditorCanvas ref={canvasRef} hideSelectionUI={hideSelectionUI} />

          <FloatingToolButtons
            onPressBackground={() => setIsBackgroundSheetVisible(true)}
            onPressSticker={() => setIsStickerSheetVisible(true)}
          />
        </View>

        <StickerPanelSheet
          visible={isStickerSheetVisible}
          onClose={() => setIsStickerSheetVisible(false)}
          onSelectSticker={({ stickerId, imageSource }) => {
            addSticker({ stickerId, imageSource });
          }}
        />

        <BackgroundPanelSheet
          visible={isBackgroundSheetVisible}
          onClose={() => setIsBackgroundSheetVisible(false)}
          selectedBackgroundId={background?.id ?? null}
          onSelectBackground={(item) => {
            setBackground({
              id: item.id,
              imageSource: item.imageSource,
              backgroundColor: item.backgroundColor,
            });
          }}
        />
      </View>
    </Screen>
  );
};

export default EditorScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasArea: {
    flex: 1,
  },
});
