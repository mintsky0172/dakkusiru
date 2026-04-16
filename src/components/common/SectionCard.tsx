import { StyleSheet, Text, View, ViewProps } from "react-native";
import React from "react";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";

interface SectionCardProps extends ViewProps {
  children: React.ReactNode;
}

const SectionCard = ({ children, style, ...props }: SectionCardProps) => {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
};

export default SectionCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
});
