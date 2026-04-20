import { Alert, Animated, Easing, StyleSheet, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../store/editorStore";
import Screen from "../components/common/Screen";
import EditorTopBar from "../components/editor/EditorTopBar";
import EditorCanvas from "../components/editor/EditorCanvas";
import FloatingToolButtons from "../components/editor/FloatingToolButtons";
import StickerPanelSheet from "../components/editor/StickerPanelSheet";
import { AppText } from "../components/common/AppText";
import { colors } from "../constants/colors";
import { radius, spacing } from "../constants/spacing";
import BackgroundPanelSheet from "../components/editor/BackgroundPanelSheet";
import ViewShot from "react-native-view-shot";
import { saveCanvasToGallery } from "../utils/saveCanvasToGallery";

const NewDakkuScreen = () => {
  const [isStickerSheetVisible, setIsStickerSheetVisible] = useState(false);
  const [isBackgroundSheetVisible, setIsBackgroundSheetVisible] =
    useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const canvasRef = useRef<ViewShot>(null);

  const background = useEditorStore((state) => state.background);
  const addSticker = useEditorStore((state) => state.addSticker);
  const addText = useEditorStore((state) => state.addText);
  const setBackground = useEditorStore((state) => state.setBackground);
  const removeSelectedObject = useEditorStore(
    (state) => state.removeSelectedObject,
  );
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(8)).current;

  const handleOpenStickerPanel = () => {
    setIsStickerSheetVisible(true);
  };

  const handleCloseStickerPanel = () => {
    setIsStickerSheetVisible(false);
  };

  const handleOpenBackgroundPanel = () => {
    setIsBackgroundSheetVisible(true);
  };

  const handleCloseBackgroundPanel = () => {
    setIsBackgroundSheetVisible(false);
  };

  const handleSaveImage = async () => {
    try {
      const uri = await canvasRef.current?.capture?.();

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

  useEffect(() => {
    if (!toastVisible) return;

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    const timeoutId = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: 8,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setToastVisible(false);
      });
    }, 900);

    return () => clearTimeout(timeoutId);
  }, [toastOpacity, toastTranslateY, toastVisible]);

  return (
    <Screen padded={false}>
      <View style={styles.container}>
        <EditorTopBar
          onRemove={removeSelectedObject}
          onSave={handleSaveImage}
          onAddText={addText}
        />

        <View style={styles.canvasArea}>
          <EditorCanvas ref={canvasRef} />

          <FloatingToolButtons
            onPressBackground={handleOpenBackgroundPanel}
            onPressSticker={handleOpenStickerPanel}
          />

          {toastVisible ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.toast,
                {
                  opacity: toastOpacity,
                  transform: [{ translateY: toastTranslateY }],
                },
              ]}
            >
              <AppText variant="small" style={styles.toastText}>
                스티커가 추가됐어요
              </AppText>
            </Animated.View>
          ) : null}
        </View>

        <StickerPanelSheet
          visible={isStickerSheetVisible}
          onClose={handleCloseStickerPanel}
          onSelectSticker={({ stickerId, imageSource }) => {
            addSticker({ stickerId, imageSource });
            toastOpacity.setValue(0);
            toastTranslateY.setValue(8);
            setToastVisible(true);
          }}
        />

        <BackgroundPanelSheet
          visible={isBackgroundSheetVisible}
          onClose={handleCloseBackgroundPanel}
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

export default NewDakkuScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasArea: {
    flex: 1,
  },
  toast: {
    position: "absolute",
    top: spacing.md,
    alignSelf: "center",
    backgroundColor: colors.background.base,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  toastText: {
    color: colors.text.primary,
  },
});
