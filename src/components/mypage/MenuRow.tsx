import {
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Image,
  View,
} from "react-native";
import React from "react";
import { AppText } from "../common/AppText";
import { radius, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";

interface MenuRowProps {
  label: string;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
  danger?: boolean;
  rightText?: string;
}

const MenuRow = ({
  label,
  imageSource,
  onPress,
  danger = false,
  rightText,
}: MenuRowProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        {imageSource ? (
          <Image source={imageSource} style={styles.icon} />
        ) : (
          <View style={styles.iconPlaceholder} />
        )}

        <AppText
          variant="body"
          style={danger ? styles.dangerText : styles.normalText}
        >
          {label}
        </AppText>
      </View>

      <View style={styles.right}>
        {rightText ? (
          <AppText variant="small" style={styles.rightText}>
            {rightText}
          </AppText>
        ) : null}
        <AppText variant="body" style={styles.chevron}>
          ﹥
        </AppText>
      </View>
    </Pressable>
  );
};

export default MenuRow;

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pressed: {
    opacity: 0.9,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  icon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  iconPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background.subtle,
  },
  normalText: {
    color: colors.text.primary,
  },
  dangerText: {
    color: colors.state.danger,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  rightText: {
    color: colors.text.muted,
  },
  chevron: {
    color: colors.text.secondary,
  },
});
