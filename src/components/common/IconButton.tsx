import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import React from "react";
import { colors } from "../../constants/colors";
import { radius } from "../../constants/spacing";

type IconButtonVariant = "ghost" | "filled" | "outlined";

interface IconButtonProps {
  icon?: React.ReactNode;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
  variant?: IconButtonVariant;
  size?: number;
  iconSize?: number;
  rounded?: boolean;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  contentTintColor?: string;
}

const IconButton = ({
  icon,
  imageSource,
  onPress,
  variant = "ghost",
  size = 44,
  iconSize = 22,
  rounded = true,
  disabled = false,
  style,
  contentTintColor,
}: IconButtonProps) => {
  const borderRadius = rounded ? size / 2 : radius.lg;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        {
          width: size,
          height: size,
          borderRadius,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {imageSource ? (
        <Image
          source={imageSource}
          style={{
            width: iconSize,
            height: iconSize,
            tintColor: contentTintColor,
            resizeMode: "contain",
          }}
        />
      ) : (
        icon
      )}
    </Pressable>
  );
};

export default IconButton;

const styles = StyleSheet.create({
  base: {
    justifyContent: "center",
    alignItems: "center",
  },
});

const variantStyles = StyleSheet.create({
  ghost: {
    backgroundColor: "transparent",
  },
  filled: {
    backgroundColor: colors.background.subtle,
  },
  outlined: {
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
});
