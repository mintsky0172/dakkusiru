import { Image, Pressable, StyleSheet, View } from "react-native";
import React, { forwardRef, useEffect, useState } from "react";
import { useEditorStore } from "../../store/editorStore";
import StickerItem from "./StickerItem";
import { colors } from "../../constants/colors";
import ViewShot from "react-native-view-shot";
import TextItem from "./TextItem";
import { CanvasText, ObjectResizeOptions } from "../../types/editor";
import PhotoItem from "./PhotoItem";

interface EditorCanvasProps {
  hideSelectionUI?: boolean;
  onEditPhoto?: (photoId: string) => void;
}

const TEXT_SAFE_PADDING = 16;
const MIN_TEXT_WIDTH = 120;
const MIN_TEXT_HEIGHT = 44;

const EditorCanvas = forwardRef<ViewShot, EditorCanvasProps>(
  ({ hideSelectionUI = false, onEditPhoto }, ref) => {
    const [canvasSize, setCanvasSize] = useState({
      width: 0,
      height: 0,
    });
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [editingTextDraft, setEditingTextDraft] = useState("");
    const [editingTextHeight, setEditingTextHeight] = useState(0);

    const background = useEditorStore((state) => state.background);
    const objects = useEditorStore((state) => state.objects);
    const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
    const selectObject = useEditorStore((state) => state.selectObject);
    const updateObjectPosition = useEditorStore(
      (state) => state.updateObjectPosition,
    );
    const bringObjectForward = useEditorStore(
      (state) => state.bringObjectForward,
    );
    const updateObjectSize = useEditorStore((state) => state.updateObjectSize);
    const updateObjectRotation = useEditorStore(
      (state) => state.updateObjectRotation,
    );
    const orderedObjects = [...objects].sort((a, b) => a.zIndex - b.zIndex);

    const removeObject = useEditorStore((state) => state.removeObject);
    const updateTextContent = useEditorStore(
      (state) => state.updateTextContent,
    );
    useEffect(() => {
      if (!editingTextId) return;

      const editingItem = objects.find(
        (item): item is CanvasText =>
          item.id === editingTextId && item.type === "text",
      );

      if (!editingItem) {
        setEditingTextId(null);
        setEditingTextDraft("");
        setEditingTextHeight(0);
      }
    }, [editingTextId, objects]);

    const finishEditingText = (nextSelectedId?: string | null) => {
      if (!editingTextId) {
        if (nextSelectedId !== undefined) {
          selectObject(nextSelectedId);
        }
        return;
      }

      const currentItem = objects.find(
        (item): item is CanvasText =>
          item.id === editingTextId && item.type === "text",
      );
      const nextText = editingTextDraft.trim() || "텍스트 입력";

      if (currentItem && currentItem.text !== nextText) {
        updateTextContent(editingTextId, nextText, editingTextHeight);
      }

      setEditingTextId(null);
      setEditingTextDraft("");
      setEditingTextHeight(0);

      if (nextSelectedId !== undefined) {
        selectObject(nextSelectedId);
      }
    };

    const startEditingText = (item: CanvasText) => {
      setEditingTextId(item.id);
      setEditingTextDraft(item.text);
      setEditingTextHeight(item.height);
      selectObject(item.id);
    };

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
          Math.max(
            TEXT_SAFE_PADDING,
            canvasSize.width - width - TEXT_SAFE_PADDING,
          ),
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
        <Pressable
          style={styles.canvas}
          onPress={() => {
            finishEditingText(null);
          }}
        >
          {background?.imageSource ? (
            <Image
              source={background.imageSource}
              style={styles.backgroundImage}
            />
          ) : null}

          {orderedObjects.map((item) => {
            const isSelected = !hideSelectionUI && selectedObjectId === item.id;

            if (item.type === "sticker") {
              return (
                <StickerItem
                  key={item.id}
                  item={item}
                  selected={isSelected}
                  onSelect={() => finishEditingText(item.id)}
                  onDragStart={() => {
                    finishEditingText(item.id);
                    bringObjectForward(item.id);
                  }}
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

            if (item.type === "photo") {
              return (
                <PhotoItem
                  key={item.id}
                  item={item}
                  selected={isSelected}
                  onSelect={() => finishEditingText(item.id)}
                  onDragStart={() => {
                    finishEditingText(item.id);
                    bringObjectForward(item.id);
                  }}
                  onDragEnd={(x, y) => updateObjectPosition(item.id, x, y)}
                  onResizeEnd={(width, height, options) =>
                    updateObjectSize(item.id, width, height, options)
                  }
                  onRotateEnd={(rotation) =>
                    updateObjectRotation(item.id, rotation)
                  }
                  onDelete={() => removeObject(item.id)}
                  onEdit={() => {
                    finishEditingText(item.id);
                    bringObjectForward(item.id);
                    onEditPhoto?.(item.id);
                  }}
                />
              );
            }
            const isEditing = !hideSelectionUI && editingTextId === item.id;

            return (
              <TextItem
                key={item.id}
                item={item}
                selected={isSelected}
                editing={isEditing}
                editingText={
                  editingTextId === item.id ? editingTextDraft : undefined
                }
                onSelect={() => finishEditingText(item.id)}
                onDragStart={() => {
                  bringObjectForward(item.id);
                }}
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
                onEdit={() => startEditingText(item)}
                onEditingTextChange={setEditingTextDraft}
                onEditingHeightChange={setEditingTextHeight}
                onEditingEnd={() => finishEditingText(item.id)}
              />
            );
          })}
        </Pressable>
      </ViewShot>
    );
  },
);

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
