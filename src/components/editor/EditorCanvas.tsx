import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import React, { forwardRef } from "react";
import { useEditorStore } from "../../store/editorStore";
import StickerItem from "./StickerItem";
import { colors } from "../../constants/colors";
import ViewShot from "react-native-view-shot";
import TextItem from "./TextItem";

const EditorCanvas = forwardRef<ViewShot>((_, ref) => {
  const background = useEditorStore((state) => state.background);
  const objects = useEditorStore((state) => state.objects);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectObject = useEditorStore((state) => state.selectObject);
  const updateObjectPosition = useEditorStore(
    (state) => state.updateObjectPosition,
  );
  const bringObjectToFront = useEditorStore(
    (state) => state.bringObjectToFront,
  );
  const orderedStickers = [...objects]
    .filter((item) => item.type === "sticker")
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <ViewShot
      ref={ref}
      style={[
        styles.canvas,
        background?.backgroundColor
          ? { backgroundColor: background.backgroundColor }
          : null,
      ]}
      options={{
        format: "png",
        quality: 1,
      }}
    >
      <Pressable style={styles.canvas} onPress={() => selectObject(null)}>
        {background?.imageSource ? (
          <Image
            source={background.imageSource}
            style={styles.backgroundImage}
          />
        ) : null}

        {objects.map((item) => {
          if (item.type === 'sticker') {
            return (
              <StickerItem
            key={item.id}
            item={item}
            selected={selectedObjectId === item.id}
            onSelect={() => selectObject(item.id)}
            onDragStart={() => bringObjectToFront(item.id)}
            onDragEnd={(x, y) => updateObjectPosition(item.id, x, y)}
          /> 
            )
          }

        return (
          <TextItem
            key={item.id}
            item={item}
            selected={selectedObjectId === item.id}
            onSelect={() => selectObject(item.id)}
            onDragStart={() => bringObjectToFront}
            onDragEnd={(x, y) => updateObjectPosition(item.id, x, y)}
          />
        )
        })}
      </Pressable>
    </ViewShot>
  );
});

export default EditorCanvas;

EditorCanvas.displayName = 'EditorCanvas';

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
