import { Animated, Easing, Image, Pressable, StyleSheet, View } from "react-native";
import React, { useEffect, useRef } from "react";
import { CanvasSticker } from "../../types/editor";
import { colors } from "../../constants/colors";

interface StickerItemProps {
  item: CanvasSticker;
  selected?: boolean;
  onPress?: () => void;
}

const StickerItem = ({ item, selected = false, onPress }: StickerItemProps) => {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          left: item.x,
          top: item.y,
          width: item.width,
          height: item.height,
          zIndex: item.zIndex,
          opacity,
          transform: [{ scale: selected ? Animated.multiply(scale, 1.02) : scale }],
        },
      ]}
    >
      <Pressable onPress={onPress} style={styles.pressable}>
        {item.imageSource ? (
          <Image source={item.imageSource} style={styles.image} />
        ) : (
          <View style={styles.placeholder} />
        )}

        {selected ? (
          <View pointerEvents="none" style={styles.selectedBorder} />
        ) : null}
      </Pressable>
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
