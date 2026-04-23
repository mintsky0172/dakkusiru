import {
  NativeSyntheticEvent,
  PanResponder,
  StyleSheet,
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
  onRotateEnd?: (rotation: number) => void;
  onDelete?: () => void;
  onEdit?: () => void;
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
}: TextItemProps) => {
  const contentRef = useRef<View>(null);
  const measuredHeightRef = useRef(item.height);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

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

  const handleTextLayout = (
    event: NativeSyntheticEvent<TextLayoutEventData>,
  ) => {
    const measuredTextHeight = event.nativeEvent.lines.reduce(
      (total, line) => total + line.height,
      0,
    );
    const nextHeight =
      measuredTextHeight + spacing.xs * 2;

    if (nextHeight <= item.height || nextHeight === measuredHeightRef.current) {
      return;
    }

    measuredHeightRef.current = nextHeight;
    onResizeEnd?.(item.width, nextHeight, { source: "content" });
  };

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
  return (
    <View
      ref={contentRef}
      style={[
        styles.wrapper,
        {
          left: item.x,
          top: item.y,
          width: item.width,
          height: item.height,
          zIndex: item.zIndex,
          transform: getTransform(0, 0)
        }
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.contentBox}>
        <View style={styles.textBox}>
          <AppText  
            variant='bodyStrong'
            onTextLayout={handleTextLayout}
            style={{
              width: "100%",
              fontSize: item.fontSize,
              color: item.color,
              lineHeight: Math.max(item.fontSize, Math.round(item.fontSize * 1.25)),
            }}
          >
            {item.text}
          </AppText>
        </View>
      </View>

      {selected && !isDragging ? (
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
            onRotateEnd={(rotation) => onRotateEnd?.(rotation)}
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
});
