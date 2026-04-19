import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
} from "react-native";
import React from "react";
import { colors } from "../../constants/colors";
import { AppText } from "./AppText";
import { radius, spacing } from "../../constants/spacing";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface AppButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactNode;
}

const AppButton = ({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  leftIcon,
}: AppButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary" ? colors.text.inverse : colors.text.primary
          }
        />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
          <AppText
            variant="button"
            style={[
              styles.label,
              labelStyles[variant],
              isDisabled && styles.disabledLabel,
            ]}
          >
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
};

export default AppButton;

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    backgroundColor: colors.button.disabledBg,
  },
  label: {
    textAlign: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconSlot: {
    marginRight: spacing.xs,
  },
  disabledLabel: {
    color: colors.button.disabledText,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.button.primaryBg,
  },
  secondary: {
    backgroundColor: colors.button.secondaryBg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  ghost: {
    backgroundColor: "transparent",
  },
});

const labelStyles = StyleSheet.create({
  primary: {
    color: colors.button.primaryText,
  },
  secondary: {
    color: colors.button.secondaryText,
  },
  ghost: {
    color: colors.button.ghostText,
  },
});
