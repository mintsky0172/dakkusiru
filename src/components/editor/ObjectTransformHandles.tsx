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
import { ObjectResizeOptions, ResizeHandleAxis } from "../../types/editor";

interface ObjectTransformHandlesProps {
  width: number;
  height: number;
  rotation: number;
  resizeMode?: "proportional" | "free";
  measureParentInWindow?: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
  onResizeEnd: (
    width: number,
    height: number,
    options?: ObjectResizeOptions,
  ) => void;
  onRotateEnd: (rotation: number) => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

const MIN_SIZE = 40;

const ObjectTransformHandles = ({
  width,
  height,
  rotation,
  resizeMode = "proportional",
  measureParentInWindow,
  onResizeEnd,
  onRotateEnd,
  onDelete,
  onEdit,
}: ObjectTransformHandlesProps) => {
  const startSizeRef = useRef({ width, height });
  const startRotationRef = useRef(rotation);
  const centerRef = useRef<{ x: number; y: number } | null>(null);
  const startAngleRef = useRef(0);
  const startRadiusRef = useRef(0);
  const startPointerRef = useRef<{ pageX: number; pageY: number } | null>(null);

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

  const getNextProportionalSize = (pageX: number, pageY: number) => {
    const nextRadius = getDistanceFromCenter(pageX, pageY);
    const scale = startRadiusRef.current
      ? nextRadius / startRadiusRef.current
      : 1;

    const nextWidth = Math.max(MIN_SIZE, startSizeRef.current.width * scale);
    const ratio = startSizeRef.current.height / startSizeRef.current.width;
    const nextHeight = Math.max(MIN_SIZE, nextWidth * ratio);

    return { nextWidth, nextHeight };
  };

  const getLocalDragDelta = (pageX: number, pageY: number) => {
    if (!startPointerRef.current) {
      return { x: 0, y: 0 };
    }

    const deltaX = pageX - startPointerRef.current.pageX;
    const deltaY = pageY - startPointerRef.current.pageY;
    const angleInRadians = (rotation * Math.PI) / 180;
    const cos = Math.cos(angleInRadians);
    const sin = Math.sin(angleInRadians);

    return {
      x: deltaX * cos + deltaY * sin,
      y: -deltaX * sin + deltaY * cos,
    };
  };

  const getNextFreeSize = (
    event: GestureResponderEvent,
    axis: ResizeHandleAxis,
  ) => {
    const localDelta = getLocalDragDelta(
      event.nativeEvent.pageX,
      event.nativeEvent.pageY,
    );
    const nextWidth =
      axis === "y"
        ? startSizeRef.current.width
        : Math.max(MIN_SIZE, startSizeRef.current.width + localDelta.x);
    const nextHeight =
      axis === "x"
        ? startSizeRef.current.height
        : Math.max(MIN_SIZE, startSizeRef.current.height + localDelta.y);

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
          const { nextWidth, nextHeight } = getNextProportionalSize(
            event.nativeEvent.pageX,
            event.nativeEvent.pageY,
          );

          onResizeEnd(nextWidth, nextHeight, {
            source: "transform",
            axis: "proportional",
          });
        },

        onPanResponderRelease: (event) => {
          if (!startRadiusRef.current) return;
          const { nextWidth, nextHeight } = getNextProportionalSize(
            event.nativeEvent.pageX,
            event.nativeEvent.pageY,
          );

          onResizeEnd(nextWidth, nextHeight, {
            source: "transform",
            axis: "proportional",
          });
        },
      }),
    [height, measureParentInWindow, onResizeEnd, width],
  );

  const createFreeResizeResponder = (axis: ResizeHandleAxis) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (event) => {
        startSizeRef.current = { width, height };
        startPointerRef.current = {
          pageX: event.nativeEvent.pageX,
          pageY: event.nativeEvent.pageY,
        };
      },

      onPanResponderMove: (event) => {
        const { nextWidth, nextHeight } = getNextFreeSize(event, axis);

        onResizeEnd(nextWidth, nextHeight, { source: "transform", axis });
      },

      onPanResponderRelease: (event) => {
        const { nextWidth, nextHeight } = getNextFreeSize(event, axis);

        onResizeEnd(nextWidth, nextHeight, { source: "transform", axis });
        startPointerRef.current = null;
      },

      onPanResponderTerminate: (event) => {
        const { nextWidth, nextHeight } = getNextFreeSize(event, axis);

        onResizeEnd(nextWidth, nextHeight, { source: "transform", axis });
        startPointerRef.current = null;
      },
    });

  const resizeXResponder = useMemo(
    () => createFreeResizeResponder("x"),
    [height, onResizeEnd, rotation, width],
  );

  const resizeYResponder = useMemo(
    () => createFreeResizeResponder("y"),
    [height, onResizeEnd, rotation, width],
  );

  const resizeXYResponder = useMemo(
    () => createFreeResizeResponder("xy"),
    [height, onResizeEnd, rotation, width],
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

      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [
          styles.editHandle,
          pressed && styles.pressedHandle,
        ]}
      >
        <Image
          source={require("../../../assets/icons/pencil.png")}
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



      {resizeMode === "free" ? (
        <>
          <View
            {...resizeXResponder.panHandlers}
            style={[styles.handle, styles.resizeXHandle]}
          >
            <Image
              source={require("../../../assets/icons/horizontal.png")}
              style={styles.icon}
            />
          </View>

          <View
            {...resizeYResponder.panHandlers}
            style={[styles.handle, styles.resizeYHandle]}
          >
            <Image
              source={require("../../../assets/icons/vertical.png")}
              style={styles.icon}
            />
          </View>

          <View
            {...resizeXYResponder.panHandlers}
            style={[styles.handle, styles.resizeHandle]}
          >
            <Image
              source={require("../../../assets/icons/resize.png")}
              style={styles.icon}
            />
          </View>
        </>
      ) : (
        <View
          {...resizeResponder.panHandlers}
          style={[styles.handle, styles.resizeHandle]}
        >
          <Image
            source={require("../../../assets/icons/resize.png")}
            style={styles.icon}
          />
        </View>
      )}
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
  resizeXHandle: {
    width: 18,
    height: 18,
    right: -9,
    top: "50%",
    marginTop: -11,
  },
  resizeYHandle: {
    width: 18,
    height: 18,
    left: "50%",
    bottom: -9,
    marginLeft: -11,
  },
  icon: {
    width: "100%",
    height: "100%",
  },
  axisIndicatorVertical: {
    width: 3,
    height: 10,
    borderRadius: radius.round,
    backgroundColor: colors.accent.main,
  },
  axisIndicatorHorizontal: {
    width: 10,
    height: 3,
    borderRadius: radius.round,
    backgroundColor: colors.accent.main,
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
    opacity: 0.8,
  },
  editHandle: {
    position: 'absolute',
    left: -11,
    bottom: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent.soft,
    borderWidth: 2,
    borderColor: colors.accent.main,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
