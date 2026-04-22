import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CanvasText } from "../../types/editor";
import { AppText } from "../common/AppText";
import { radius, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";
import ObjectTransformHandles from "./ObjectTransformHandles";

interface TextItemProps {
  item: CanvasText;
  selected?: boolean;
  onSelect?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  onResizeEnd?: (width: number, height: number) => void;
  onRotateEnd?: (rotation: number) => void;
  onDelete?: () => void;
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
}: TextItemProps) => {
  const contentRef = useRef<View>(null);
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
          minHeight: item.height,
          zIndex: item.zIndex,
          transform: getTransform(0, 0)
        }
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.textBox}>
        <AppText  
          variant='bodyStrong'
          style={{
            fontSize: item.fontSize,
            color: item.color,
            lineHeight: item.fontSize,
            flexShrink: 1
          }}
        >
          {item.text}
        </AppText>
      </View>

      {selected && !isDragging ? (
        <View pointerEvents="box-none" style={styles.overlay}>
          <ObjectTransformHandles
            width={item.width}
            height={item.height}
            rotation={item.rotation}
            measureParentInWindow={(callback) => {
              contentRef.current?.measureInWindow(callback);
            }}
            onResizeEnd={(width, height) => onResizeEnd?.(width, height)}
            onRotateEnd={(rotation) => onRotateEnd?.(rotation)}
            onDelete={onDelete}
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
  textBox: {
    width: '100%',
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "flex-start",
  },
});
