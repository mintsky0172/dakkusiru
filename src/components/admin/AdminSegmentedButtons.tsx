import { StyleSheet, Text, View } from "react-native";
import React from "react";
import AppButton from "../common/AppButton";
import { spacing } from "../../constants/spacing";

interface AdminSegmentedButtonOption<T extends string> {
  label: string;
  value: T;
}

interface AdminSegmentedButtonsProps<T extends string> {
  value: T;
  options: AdminSegmentedButtonOption<T>[];
  onChange: (value: T) => void;
}

export function AdminSegmentedButtons<T extends string>({
  value,
  options,
  onChange,
}: AdminSegmentedButtonsProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((option) => (
        <AppButton
          key={option.value}
          label={option.label}
          variant={value === option.value ? "primary" : "secondary"}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
