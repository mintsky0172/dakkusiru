import {
  NativeSyntheticEvent,
  PanResponder,
  StyleSheet,
  TextInput,
  TextLayoutEventData,
  View,
} from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CanvasText, ObjectResizeOptions } from "../../types/editor";
import { AppText } from "../common/AppText";
import { radius, spacing } from "../../constants/spacing";
import ObjectTransformHandles from "./ObjectTransformHandles";

interface TextItemProps {
  item: CanvasText;
  selected?: boolean;
  onSelect?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  onResizeEnd?: (
    width: number,
    height: number,
    options?: ObjectResizeOptions,
  ) => void;
  onRotateEnd?: (rotation: number, options?: { commit?: boolean }) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  editing?: boolean;
  editingText?: string;
  onEditingTextChange?: (text: string) => void;
  onEditingHeightChange?: (height: number) => void;
  onEditingEnd?: () => void;
}

const TextItem = ({
  item,
  selected = false,
  onSelect,
  onDragStart,
  onDragEnd,
  onResizeEnd,
  onRotateEnd,
  onDelete,
  onEdit,
  editing = false,
  editingText,
  onEditingTextChange,
  onEditingHeightChange,
  onEditingEnd,
}: TextItemProps) => {
  const TEXT_INPUT_HEIGHT_BUFFER = spacing.xxs;
  const contentRef = useRef<View>(null);
  const measuredHeightRef = useRef(item.height);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [editingHeight, setEditingHeight] = useState(item.height);

  const startPositionRef = useRef({
    x: item.x,
    y: item.y,
  });

  const getTransform = (translateX = 0, translateY = 0) => [
    { translateX },
    { translateY },
    { rotate: `${item.rotation}deg` },
  ];

  useEffect(() => {
    startPositionRef.current = {
      x: item.x,
      y: item.y,
    };
  }, [item.x, item.y]);

  useEffect(() => {
    measuredHeightRef.current = item.height;
  }, [item.height]);

  const currentText = editingText ?? item.text;
  const lineHeight = Math.max(item.fontSize, Math.round(item.fontSize * 1.25));

  useEffect(() => {
    setEditingHeight(item.height);
  }, [editing, item.height, item.id]);

  useEffect(() => {
    if (!editing) return;

    const lineCount = (currentText || "").split(/\r?\n/).length;
    const nextHeight = Math.max(
      item.height,
      lineCount * lineHeight + spacing.xs * 2 + TEXT_INPUT_HEIGHT_BUFFER,
    );

    setEditingHeight(nextHeight);
    onEditingHeightChange?.(nextHeight);
  }, [
    TEXT_INPUT_HEIGHT_BUFFER,
    currentText,
    editing,
    item.height,
    lineHeight,
    onEditingHeightChange,
  ]);

  const handleTextLayout = (
    event: NativeSyntheticEvent<TextLayoutEventData>,
  ) => {
    if (editing || editingText !== undefined) return;

    const measuredTextHeight = event.nativeEvent.lines.reduce(
      (total, line) => total + line.height,
      0,
    );
    const nextHeight =
      measuredTextHeight + spacing.xs * 2 + TEXT_INPUT_HEIGHT_BUFFER;

    if (nextHeight <= item.height || nextHeight === measuredHeightRef.current) {
      return;
    }

    measuredHeightRef.current = nextHeight;
    onResizeEnd?.(item.width, nextHeight, { source: "content" });
  };
  const renderedHeight =
    editing || editingText !== undefined
      ? Math.max(item.height, editingHeight)
      : item.height;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,

        onPanResponderGrant: () => {
          onSelect?.();
          onDragStart?.();
          setIsDragging(true);

          startPositionRef.current = {
            x: item.x,
            y: item.y,
          };

          dragOffsetRef.current = { x: 0, y: 0 };

          contentRef.current?.setNativeProps({
            style: {
              transform: getTransform(0, 0),
            },
          });
        },

        onPanResponderMove: (_, gestureState) => {
          dragOffsetRef.current = {
            x: gestureState.dx,
            y: gestureState.dy,
          };

          contentRef.current?.setNativeProps({
            style: {
              transform: getTransform(gestureState.dx, gestureState.dy),
            },
          });
        },

        onPanResponderRelease: (_, gestureState) => {
          const nextX = startPositionRef.current.x + gestureState.dx;
          const nextY = startPositionRef.current.y + gestureState.dy;

          dragOffsetRef.current = { x: 0, y: 0 };

          contentRef.current?.setNativeProps({
            style: {
              left: nextX,
              top: nextY,
              transform: getTransform(0, 0),
            },
          });

          onDragEnd?.(nextX, nextY);
          setIsDragging(false);
        },

        onPanResponderTerminate: (_, gestureState) => {
          const nextX = startPositionRef.current.x + gestureState.dx;
          const nextY = startPositionRef.current.y + gestureState.dy;

          dragOffsetRef.current = { x: 0, y: 0 };

          contentRef.current?.setNativeProps({
            style: {
              left: nextX,
              top: nextY,
              transform: getTransform(0, 0),
            },
          });

          onDragEnd?.(nextX, nextY);
          setIsDragging(false)
        },
      }),
    [item.x, item.y, item.rotation, onDragEnd, onDragStart, onSelect],
  );

  const textStyle = {
    width: "100%",
    fontSize: item.fontSize,
    color: item.color,
    lineHeight,
  } as const;

  return (
    <View
      ref={contentRef}
      style={[
        styles.wrapper,
        {
          left: item.x,
          top: item.y,
          width: item.width,
          height: renderedHeight,
          zIndex: item.zIndex,
          transform: getTransform(0, 0)
        }
      ]}
    >
      <View
        {...(!editing ? panResponder.panHandlers : {})}
        style={styles.contentBox}
      >
        <View style={styles.textBox}>
          {editing ? (
            <TextInput
              value={currentText}
              onChangeText={onEditingTextChange}
              onBlur={onEditingEnd}
              autoFocus
              multiline
              scrollEnabled={false}
              autoCorrect={false}
              spellCheck={false}
              underlineColorAndroid="transparent"
              textAlignVertical="top"
              style={[styles.input, textStyle]}
              onContentSizeChange={(event) => {
                const nextHeight =
                  event.nativeEvent.contentSize.height +
                  spacing.xs * 2 +
                  TEXT_INPUT_HEIGHT_BUFFER;
                const resolvedHeight = Math.max(item.height, nextHeight);
                setEditingHeight(resolvedHeight);
                onEditingHeightChange?.(resolvedHeight);
              }}
            />
          ) : (
            <AppText
              variant='bodyStrong'
              onTextLayout={handleTextLayout}
              style={textStyle}
            >
              {currentText}
            </AppText>
          )}
        </View>
      </View>

      {selected && !isDragging && !editing ? (
        <View pointerEvents="box-none" style={styles.overlay}>
          <ObjectTransformHandles
            width={item.width}
            height={item.height}
            rotation={item.rotation}
            resizeMode="free"
            measureParentInWindow={(callback) => {
              contentRef.current?.measureInWindow(callback);
            }}
            onResizeEnd={(width, height, options) =>
              onResizeEnd?.(width, height, options)
            }
            onRotateEnd={(rotation, options) => onRotateEnd?.(rotation, options)}
            onDelete={onDelete}
            onEdit={onEdit}
          /> 
        </View>
      ) : null}
    </View>
  );
};

export default TextItem;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject
  },
  contentBox: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    borderRadius: radius.md,
  },
  textBox: {
    width: '100%',
    height: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  input: {
    padding: 0,
    margin: 0,
    fontFamily: "Iseoyun",
  },
});
