import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import React from "react";
import { Activity } from "lucide-react-native";
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
  style?: ViewStyle | ViewStyle[];
}

const AppButton = ({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
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
    paddingVertical: spacing.sm,
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
