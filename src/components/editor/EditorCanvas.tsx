import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import React from "react";
import { useEditorStore } from "../../store/editorStore";
import StickerItem from "./StickerItem";
import { colors } from "../../constants/colors";

const EditorCanvas = () => {
  const background = useEditorStore((state) => state.background);
  const stickers = useEditorStore((state) => state.stickers);
  const selectedStickerId = useEditorStore((state) => state.selectedStickerId);
  const selectSticker = useEditorStore((state) => state.selectSticker);
  const updateStickerPosition = useEditorStore(
    (state) => state.updateStickerPosition,
  );
  const bringStickerToFront = useEditorStore(
    (state) => state.bringStickerToFront,
  );
  const orderedStickers = [...stickers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <Pressable
      style={[
        styles.canvas,
        background?.backgroundColor
          ? { backgroundColor: background.backgroundColor }
          : null,
      ]}
      onPress={() => selectSticker(null)}
    >
      {background?.imageSource ? (
        <Image source={background.imageSource} style={styles.backgroundImage} />
      ) : null}

      {orderedStickers.map((item) => (
        <StickerItem
          key={item.id}
          item={item}
          selected={selectedStickerId === item.id}
          onSelect={() => selectSticker(item.id)}
          onDragStart={() => bringStickerToFront(item.id)}
          onDragEnd={(x, y) => updateStickerPosition(item.id, x, y)}
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
    overflow: "hidden",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
});
