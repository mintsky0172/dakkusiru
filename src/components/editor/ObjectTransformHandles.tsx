import {
  GestureResponderEvent,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import React, { useMemo, useRef } from "react";
import { colors } from "../../constants/colors";
import { radius } from "../../constants/spacing";

interface ObjectTransformHandlesProps {
  width: number;
  height: number;
  rotation: number;
  measureParentInWindow?: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
  onResizeEnd: (width: number, height: number) => void;
  onRotateEnd: (rotation: number) => void;
  onDelete?: () => void;
}

const MIN_SIZE = 40;

const ObjectTransformHandles = ({
  width,
  height,
  rotation,
  measureParentInWindow,
  onResizeEnd,
  onRotateEnd,
  onDelete,
}: ObjectTransformHandlesProps) => {
  const startSizeRef = useRef({ width, height });
  const startRotationRef = useRef(rotation);
  const centerRef = useRef<{ x: number; y: number } | null>(null);
  const startAngleRef = useRef(0);
  const startRadiusRef = useRef(0);

  const updateCenter = (afterMeasure?: () => void) => {
    if (!measureParentInWindow) {
      afterMeasure?.();
      return;
    }

    measureParentInWindow((x, y, measuredWidth, measuredHeight) => {
      centerRef.current = {
        x: x + measuredWidth / 2,
        y: y + measuredHeight / 2,
      };
      afterMeasure?.();
    });
  };

  const getAngleInDegrees = (pageX: number, pageY: number) => {
    if (!centerRef.current) return startRotationRef.current;

    const dx = pageX - centerRef.current.x;
    const dy = pageY - centerRef.current.y;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  const getDistanceFromCenter = (pageX: number, pageY: number) => {
    if (!centerRef.current) return 0;

    const dx = pageX - centerRef.current.x;
    const dy = pageY - centerRef.current.y;
    return Math.hypot(dx, dy);
  };

  const getNextSize = (event: GestureResponderEvent) => {
    const nextRadius = getDistanceFromCenter(
      event.nativeEvent.pageX,
      event.nativeEvent.pageY,
    );
    const scale = startRadiusRef.current
      ? nextRadius / startRadiusRef.current
      : 1;

    const nextWidth = Math.max(MIN_SIZE, startSizeRef.current.width * scale);
    const ratio = startSizeRef.current.height / startSizeRef.current.width;
    const nextHeight = Math.max(MIN_SIZE, nextWidth * ratio);

    return { nextWidth, nextHeight };
  };

  const resizeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: (event) => {
          startSizeRef.current = { width, height };
          startRadiusRef.current = 0;

          const { pageX, pageY } = event.nativeEvent;

          updateCenter(() => {
            startRadiusRef.current = getDistanceFromCenter(pageX, pageY);
          });
        },

        onPanResponderMove: (event) => {
          if (!startRadiusRef.current) return;
          const { nextWidth, nextHeight } = getNextSize(event);

          onResizeEnd(nextWidth, nextHeight);
        },

        onPanResponderRelease: (event) => {
          if (!startRadiusRef.current) return;
          const { nextWidth, nextHeight } = getNextSize(event);

          onResizeEnd(nextWidth, nextHeight);
        },
      }),
    [height, measureParentInWindow, onResizeEnd, width],
  );

  const rotateResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: (event) => {
          startRotationRef.current = rotation;

          const { pageX, pageY } = event.nativeEvent;

          updateCenter(() => {
            startAngleRef.current = getAngleInDegrees(pageX, pageY);
          });
        },

        onPanResponderMove: (event) => {
          const currentAngle = getAngleInDegrees(
            event.nativeEvent.pageX,
            event.nativeEvent.pageY,
          );
          const nextRotation =
            startRotationRef.current + (currentAngle - startAngleRef.current);

          onRotateEnd(nextRotation);
        },

        onPanResponderRelease: (event) => {
          const currentAngle = getAngleInDegrees(
            event.nativeEvent.pageX,
            event.nativeEvent.pageY,
          );
          const nextRotation =
            startRotationRef.current + (currentAngle - startAngleRef.current);

          onRotateEnd(nextRotation);
        },
      }),
    [measureParentInWindow, onRotateEnd, rotation],
  );
  return (
    <>
      <View pointerEvents="none" style={styles.border} />

      <Pressable
        onPress={onDelete}
        style={({ pressed }) => [
          styles.deleteHandle,
          pressed && styles.pressedHandle,
        ]}
      >
        <Image
          source={require("../../../assets/icons/x.png")}
          style={styles.icon}
        />
      </Pressable>

      <View
        {...rotateResponder.panHandlers}
        style={[styles.handle, styles.rotateHandle]}
      >
        <Image
          source={require("../../../assets/icons/rotate.png")}
          style={styles.icon}
        />
      </View>

      <View
        {...resizeResponder.panHandlers}
        style={[styles.handle, styles.resizeHandle]}
      >
        <Image
          source={require("../../../assets/icons/resize.png")}
          style={styles.icon}
        />
      </View>
    </>
  );
};

export default ObjectTransformHandles;

const styles = StyleSheet.create({
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: colors.accent.main,
    borderStyle: "dashed",
    borderRadius: radius.md,
  },
  handle: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent.soft,
    borderWidth: 2,
    borderColor: colors.accent.main,
    alignItems: "center",
    justifyContent: "center",
  },
  rotateHandle: {
    right: -11,
    top: -11,
  },
  resizeHandle: {
    right: -11,
    bottom: -11,
  },
  icon: {
    width: "100%",
    height: "100%",
  },
  deleteHandle: {
    position: "absolute",
    left: -12,
    top: -12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent.soft,
    borderWidth: 2,
    borderColor: colors.accent.main,
    alignItems: "center",
    justifyContent: "center",
  },
  pressedHandle: {
    opacity: 0.8
  }
});
