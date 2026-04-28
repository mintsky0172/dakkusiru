import { PanResponder, StyleSheet, Image, View } from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CanvasPhoto } from "../../types/editor";
import ObjectTransformHandles from "./ObjectTransformHandles";

interface PhotoItemProps {
  item: CanvasPhoto;
  selected?: boolean;
  onSelect?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  onResizeEnd?: (width: number, height: number) => void;
  onRotateEnd?: (rotation: number) => void;
  onDelete?: () => void;
}

const PhotoItem = ({
  item,
  selected = false,
  onSelect,
  onDragStart,
  onDragEnd,
  onResizeEnd,
  onRotateEnd,
  onDelete,
}: PhotoItemProps) => {
  const DRAG_ACTIVATION_DISTANCE = 8;
  const contentRef = useRef<View>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragActivationOffsetRef = useRef({ x: 0, y: 0 });
  const dragActivatedRef = useRef(false);
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

  const resetDragState = () => {
    dragOffsetRef.current = { x: 0, y: 0 };
    dragActivationOffsetRef.current = { x: 0, y: 0 };
    dragActivatedRef.current = false;
    setIsDragging(false);
  };

  const resolveDragOffset = (dx: number, dy: number) => {
    if (!dragActivatedRef.current) {
      const distance = Math.hypot(dx, dy);
      if (distance < DRAG_ACTIVATION_DISTANCE) {
        return { x: 0, y: 0 };
      }

      dragActivatedRef.current = true;
      dragActivationOffsetRef.current = { x: dx, y: dy };
      onDragStart?.();
      setIsDragging(true);
    }

    return {
      x: dx - dragActivationOffsetRef.current.x,
      y: dy - dragActivationOffsetRef.current.y,
    };
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.hypot(gestureState.dx, gestureState.dy) > 2,
        onPanResponderTerminationRequest: () => false,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          Math.hypot(gestureState.dx, gestureState.dy) > 2,

        onPanResponderGrant: () => {
          onSelect?.();

          startPositionRef.current = {
            x: item.x,
            y: item.y,
          };

          resetDragState();

          contentRef.current?.setNativeProps({
            style: {
              transform: getTransform(0, 0),
            },
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const nextOffset = resolveDragOffset(
            gestureState.dx,
            gestureState.dy,
          );
          dragOffsetRef.current = nextOffset;

          contentRef.current?.setNativeProps({
            style: {
              transform: getTransform(nextOffset.x, nextOffset.y),
            },
          });
        },
        onPanResponderRelease: () => {
          const nextX = startPositionRef.current.x + dragOffsetRef.current.x;
          const nextY = startPositionRef.current.y + dragOffsetRef.current.y;

          contentRef.current?.setNativeProps({
            style: {
              left: nextX,
              top: nextY,
              transform: getTransform(0, 0),
            },
          });

          if (dragActivatedRef.current) {
            onDragEnd?.(nextX, nextY);
          }
          resetDragState();
        },

        onPanResponderTerminate: () => {
          const nextX = startPositionRef.current.x + dragOffsetRef.current.x;
          const nextY = startPositionRef.current.y + dragOffsetRef.current.y;

          contentRef.current?.setNativeProps({
            style: {
              left: nextX,
              top: nextY,
              transform: getTransform(0, 0),
            },
          });

          if (dragActivatedRef.current) {
            onDragEnd?.(nextX, nextY);
          }
          resetDragState();
        },
      }),
    [
      DRAG_ACTIVATION_DISTANCE,
      item.x,
      item.y,
      item.rotation,
      onSelect,
      onDragStart,
      onDragEnd,
    ],
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
          transform: getTransform(0, 0),
        },
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.pressable}>
        <Image source={{ uri: item.uri }} style={styles.image} />
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

export default PhotoItem;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    backgroundColor: "transparent",
    overflow: "visible",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  pressable: {
    width: "100%",
    height: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
});
