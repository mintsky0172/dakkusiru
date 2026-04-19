import { StyleSheet, Text, View } from "react-native";
import React from "react";
import IconButton from "../common/IconButton";
import { spacing } from "../../constants/spacing";

interface FloatingToolButtonsProps {
  onPressBackground?: () => void;
  onPressSticker?: () => void;
}

const FloatingToolButtons = ({
  onPressBackground,
  onPressSticker,
}: FloatingToolButtonsProps) => {
  return (
    <View style={styles.container}>
      <IconButton
        imageSource={require("../../../assets/icons/wallpaper.png")}
        onPress={onPressBackground}
        variant="filledPinkSoft"
        size={56}
        iconSize={24}
      />
      <IconButton
        imageSource={require("../../../assets/icons/heart_pink.png")}
        onPress={onPressSticker}
        variant="filledPinkAccent"
        size={56}
        iconSize={24}
      />
    </View>
  );
};

export default FloatingToolButtons;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.md,
    bottom: spacing.xxl,
    gap: spacing.sm,
  },
});
