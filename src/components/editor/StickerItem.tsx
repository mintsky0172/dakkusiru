import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import React, { useEffect, useMemo, useRef } from "react";
import { CanvasSticker } from "../../types/editor";
import { colors } from "../../constants/colors";

interface StickerItemProps {
  item: CanvasSticker;
  selected?: boolean;
  onSelect?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
}

const StickerItem = ({
  item,
  selected = false,
  onSelect,
  onDragStart,
  onDragEnd,
}: StickerItemProps) => {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const startPositionRef = useRef({
    x: item.x,
    y: item.y,
  });

  // 스티커 추가 시 애니메이션
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.06,
          duration: 120,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [opacity, scale]);

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
          height: item.height,
          zIndex: item.zIndex,
          opacity,
          transform: [
            { scale: selected ? Animated.multiply(scale, 1.02) : scale },
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        },
      ]}
    >
      
        {item.imageSource ? (
          <Image source={item.imageSource} style={styles.image} />
        ) : (
          <View style={styles.placeholder} />
        )}

        {selected ? (
          <View pointerEvents="none" style={styles.selectedBorder} />
        ) : null}

    </Animated.View>
  );
};

export default StickerItem;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
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
  selectedBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: colors.accent.main,
    borderStyle: "dashed",
    borderRadius: 8,
  },
});
