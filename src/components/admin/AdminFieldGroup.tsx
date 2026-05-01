import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import React from "react";
import { AppText } from "../common/AppText";
import { spacing } from "../../constants/spacing";

interface AdminFieldGroupProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const AdminFieldGroup = ({
  label,
  description,
  children,
  style,
}: AdminFieldGroupProps) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelArea}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? (
          <AppText variant="caption" style={styles.description}>
            {description}
          </AppText>
        ) : null}
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
};

export default AdminFieldGroup;

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  labelArea: {
    gap: 2,
  },
  description: {
    opacity: 0.75,
  },
  content: {
    gap: spacing.sm,
  },
});
