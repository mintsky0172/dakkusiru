import { Alert, StyleSheet, Text, View } from "react-native";
import React from "react";
import { useEditorStore } from "../store/editorStore";
import { mockBasicStickers } from "../mocks/stickers";
import Screen from "../components/common/Screen";
import EditorTopBar from "../components/editor/EditorTopBar";
import EditorCanvas from "../components/editor/EditorCanvas";
import FloatingToolButtons from "../components/editor/FloatingToolButtons";

const NewDakkuScreen = () => {
  const addSticker = useEditorStore((state) => state.addSticker);
  const removeSelectedSticker = useEditorStore(
    (state) => state.removeSelectedSticker,
  );

  const handleOpenStickerPanel = () => {
    const firstSticker = mockBasicStickers[0];

    addSticker({
      stickerId: firstSticker.id,
      imageSource: firstSticker.imageSource,
    });
  };

  const handleOpenBackgroundPanel = () => {
    Alert.alert("배경 선택");
  };

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
        </View>
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
  }
});
