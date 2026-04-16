import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import React from "react";
import { AppText } from "./AppText";
import { radius, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
}

const Chip = ({ label, selected = false, onPress, style }: ChipProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.default,
        pressed && styles.pressed,
        style,
      ]}
    >
      <AppText
        variant="chip"
        style={selected ? styles.selectedText : styles.defaultText}
      >
        {label}
      </AppText>
    </Pressable>
  );
};

export default Chip;

const styles = StyleSheet.create({
  base: {
    minHeight: 32,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  default: {
    backgroundColor: colors.chip.defaultBg,
    borderColor: colors.border.light,
  },
  selected: {
    backgroundColor: colors.chip.selectedBg,
    borderColor: colors.accent.main,
  },
  defaultText: {
    color: colors.chip.defaultText,
  },
  selectedText: {
    color: colors.chip.selectedText,
  },
  pressed: {
    opacity: 0.9,
  },
});
