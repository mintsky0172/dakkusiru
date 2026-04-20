import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useMemo, useRef } from "react";
import { CanvasText } from "../../types/editor";
import { AppText } from "../common/AppText";
import { radius, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";

interface TextItemProps {
  item: CanvasText;
  selected?: boolean;
  onSelect?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
}

const TextItem = ({
  item,
  selected = false,
  onSelect,
  onDragStart,
  onDragEnd,
}: TextItemProps) => {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const startPositionRef = useRef({
    x: item.x,
    y: item.y,
  });

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
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
        },

        onPanResponderGrant: () => {
          onSelect?.();
          onDragStart?.();

          startPositionRef.current = {
            x: item.x,
            y: item.y,
          };

          pan.setValue({ x: 0, y: 0 });
        },

        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),

        onPanResponderRelease: (_, gestureState) => {
          const nextX = startPositionRef.current.x + gestureState.dx;
          const nextY = startPositionRef.current.y + gestureState.dy;

          pan.setValue({ x: 0, y: 0 });
          onDragEnd?.(nextX, nextY);
        },

        onPanResponderTerminate: (_, gestureState) => {
          const nextX = startPositionRef.current.x + gestureState.dx;
          const nextY = startPositionRef.current.y + gestureState.dy;

          pan.setValue({ x: 0, y: 0 });
          onDragEnd?.(nextX, nextY);
        },
      }),
    [item.x, item.y, onDragEnd, onDragStart, onSelect, pan],
  );
  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.wrapper,
        {
          left: item.x,
          top: item.y,
          width: item.width,
          minHeight: item.height,
          zIndex: item.zIndex,
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
    >
      <View style={[styles.textBox, selected && styles.selectedBox]}>
        <AppText
          variant="bodyStrong"
          style={{
            fontSize: item.fontSize,
            color: item.color,
          }}
        >
          {item.text}
        </AppText>
      </View>
    </Animated.View>
  );
};

export default TextItem;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
  },
  textBox: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  selectedBox: {
    borderWidth: 2,
    borderColor: colors.accent.main,
    borderStyle: "dashed",
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
});
