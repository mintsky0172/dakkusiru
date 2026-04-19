import { Pressable, StyleSheet, Text, View } from "react-native";
import React from "react";
import { useEditorStore } from "../../store/editorStore";
import StickerItem from "./StickerItem";
import { colors } from "../../constants/colors";

const EditorCanvas = () => {
  const stickers = useEditorStore((state) => state.stickers);
  const selectedStickerId = useEditorStore((state) => state.selectedStickerId);
  const selectSticker = useEditorStore((state) => state.selectSticker);

  return (
    <Pressable style={styles.canvas} onPress={() => selectSticker(null)}>
      {stickers.map((item) => (
        <StickerItem
          key={item.id}
          item={item}
          selected={selectedStickerId === item.id}
          onPress={() => selectSticker(item.id)}
        />
      ))}
    </Pressable>
  );
};

export default EditorCanvas;

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.background.canvas,
    overflow: 'hidden' 
  },
});
