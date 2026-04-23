import { Image, Pressable, StyleSheet, View } from "react-native";
import React, { forwardRef, useState } from "react";
import { useEditorStore } from "../../store/editorStore";
import StickerItem from "./StickerItem";
import { colors } from "../../constants/colors";
import ViewShot from "react-native-view-shot";
import TextItem from "./TextItem";
import { ObjectResizeOptions } from "../../types/editor";

interface EditorCanvasProps {
  onEditText?: () => void;
}

const TEXT_SAFE_PADDING = 16;
const MIN_TEXT_WIDTH = 120;
const MIN_TEXT_HEIGHT = 44;

const EditorCanvas = forwardRef<ViewShot, EditorCanvasProps>(
  ({onEditText}, ref) => {
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

  const clampTextPosition = (
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    if (!canvasSize.width || !canvasSize.height) {
      return { x, y };
    }

    return {
      x: Math.min(
        Math.max(TEXT_SAFE_PADDING, x),
        Math.max(TEXT_SAFE_PADDING, canvasSize.width - width - TEXT_SAFE_PADDING),
      ),
      y: Math.min(
        Math.max(TEXT_SAFE_PADDING, y),
        Math.max(
          TEXT_SAFE_PADDING,
          canvasSize.height - height - TEXT_SAFE_PADDING,
        ),
      ),
    };
  };

  const clampTextSize = (
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    if (!canvasSize.width || !canvasSize.height) {
      return { width, height };
    }

    const maxWidth = Math.max(
      MIN_TEXT_WIDTH,
      canvasSize.width - x - TEXT_SAFE_PADDING,
    );
    const maxHeight = Math.max(
      MIN_TEXT_HEIGHT,
      canvasSize.height - y - TEXT_SAFE_PADDING,
    );

    return {
      width: Math.max(MIN_TEXT_WIDTH, Math.min(width, maxWidth)),
      height: Math.max(MIN_TEXT_HEIGHT, Math.min(height, maxHeight)),
    };
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
                onResizeEnd={(width, height, options) =>
                  updateObjectSize(item.id, width, height, options)
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
              onDragEnd={(x, y) => {
                const nextPosition = clampTextPosition(
                  x,
                  y,
                  item.width,
                  item.height,
                );
                updateObjectPosition(item.id, nextPosition.x, nextPosition.y);
              }}
              onResizeEnd={(width, height, options?: ObjectResizeOptions) => {
                const nextSize = clampTextSize(item.x, item.y, width, height);
                updateObjectSize(
                  item.id,
                  nextSize.width,
                  nextSize.height,
                  options,
                );
              }}
              onRotateEnd={(rotation) =>
                updateObjectRotation(item.id, rotation)
              }
              onDelete={() => removeObject(item.id)}
              onEdit={onEditText}
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
