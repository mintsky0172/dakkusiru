import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import React, { forwardRef, useState } from "react";
import { useEditorStore } from "../../store/editorStore";
import StickerItem from "./StickerItem";
import { colors } from "../../constants/colors";
import ViewShot from "react-native-view-shot";
import TextItem from "./TextItem";

const EditorCanvas = forwardRef<ViewShot>((_, ref) => {
  const [canvasSize, setCanvasSize] = useState({
    width: 0,
    height: 0,
  });

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
  const updateObjectSize = useEditorStore((state) => state.updateObjectSize);
  const updateObjectRotation = useEditorStore(
    (state) => state.updateObjectRotation,
  );
  const orderedObjects = [...objects].sort((a, b) => a.zIndex - b.zIndex);

  const removeObject = useEditorStore((state) => state.removeObject);

  const clampTextWidth = (x: number, width: number) => {
    if (!canvasSize.width) return innerWidth;

    const SAFE_PADDING = 16;
    const MIN_WIDTH = 80;

    const maxWidth = Math.max(MIN_WIDTH, canvasSize.width - x - SAFE_PADDING);

    return Math.max(MIN_WIDTH, Math.min(width, maxWidth));
  };

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
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setCanvasSize({ width, height });
      }}
    >
      <Pressable style={styles.canvas} onPress={() => selectObject(null)}>
        {background?.imageSource ? (
          <Image
            source={background.imageSource}
            style={styles.backgroundImage}
          />
        ) : null}

        {orderedObjects.map((item) => {
          if (item.type === "sticker") {
            return (
              <StickerItem
                key={item.id}
                item={item}
                selected={selectedObjectId === item.id}
                onSelect={() => selectObject(item.id)}
                onDragStart={() => bringObjectToFront(item.id)}
                onDragEnd={(x, y) => updateObjectPosition(item.id, x, y)}
                onResizeEnd={(width, height) =>
                  updateObjectSize(item.id, width, height)
                }
                onRotateEnd={(rotation) =>
                  updateObjectRotation(item.id, rotation)
                }
                onDelete={() => removeObject(item.id)}
              />
            );
          }

          return (
            <TextItem
              key={item.id}
              item={item}
              selected={selectedObjectId === item.id}
              onSelect={() => selectObject(item.id)}
              onDragStart={() => bringObjectToFront(item.id)}
              onDragEnd={(x, y) => updateObjectPosition(item.id, x, y)}
              onResizeEnd={(width, height) => {
                const clampedWidth = clampTextWidth(item.x, width);
                updateObjectSize(item.id, clampedWidth, height);
              }}
              onRotateEnd={(rotation) =>
                updateObjectRotation(item.id, rotation)
              }
              onDelete={() => removeObject(item.id)}
            />
          );
        })}
      </Pressable>
    </ViewShot>
  );
});

export default EditorCanvas;

EditorCanvas.displayName = "EditorCanvas";

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
