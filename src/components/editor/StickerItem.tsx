import {
  Image,
  PanResponder,
  StyleSheet,
  View,
} from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CanvasSticker, ObjectResizeOptions } from "../../types/editor";
import ObjectTransformHandles from "./ObjectTransformHandles";

interface StickerItemProps {
  item: CanvasSticker;
  selected?: boolean;
  onSelect?: () => void;
  onDragStart?: () => void;
  onResizeEnd?: (
    width: number,
    height: number,
    options?: ObjectResizeOptions,
  ) => void;
  onRotateEnd?: (rotation: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  onDelete?: () => void;
}

const StickerItem = ({
  item,
  selected = false,
  onSelect,
  onDragStart,
  onDragEnd,
  onResizeEnd,
  onRotateEnd,
  onDelete,
}: StickerItemProps) => {
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

  // 스티커 드래그
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
          setIsDragging(false);
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
          transform: getTransform(0, 0),
        },
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.pressable}>
        {item.imageSource ? (
          <Image source={item.imageSource} style={styles.image} />
        ) : (
          <View style={styles.placeholder} />
        )}
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
            onResizeEnd={(width, height, options) =>
              onResizeEnd?.(width, height, options)
            }
            onRotateEnd={(rotation) => onRotateEnd?.(rotation)}
            onDelete={onDelete}
          />
        </View>
      ) : null}
    </View>
  );
};

export default StickerItem;

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
    resizeMode: "contain",
  },
  placeholder: {
    flex: 1,
    backgroundColor: "#eee",
  },
});
