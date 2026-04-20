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

const NewDakkuScreen = () => {
  const [isStickerSheetVisible, setIsStickerSheetVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const addSticker = useEditorStore((state) => state.addSticker);
  const removeSelectedSticker = useEditorStore(
    (state) => state.removeSelectedSticker,
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
    Alert.alert("배경 선택");
    // TODO : 배경 패널 붙이기
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
        <EditorTopBar onRemove={removeSelectedSticker} />

        <View style={styles.canvasArea}>
          <EditorCanvas />

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
    backgroundColor: colors.text.primary,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  toastText: {
    color: colors.text.inverse,
  },
});
