import {
  Animated,
  DimensionValue,
  Easing,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import React, { useEffect, useRef } from "react";

interface SkeletonBoxProps {
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

const SkeletonBox = ({
  width = "100%",
  height,
  borderRadius = 12,
  style,
}: SkeletonBoxProps) => {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.box,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export default SkeletonBox;

const styles = StyleSheet.create({
  box: {
    backgroundColor: "#E9E1D2", 
  },
});
