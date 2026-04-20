import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { AppText } from "./AppText";
import { layout, radius, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";

interface BottomSheetHeaderProps {
  title: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

const BottomSheetHeader = ({ title, leftSlot, rightSlot }: BottomSheetHeaderProps) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.handle} />
      <View style={styles.row}>
        {leftSlot}
        <AppText variant="h3">{title}</AppText>
        {rightSlot}
      </View>
    </View>
  );
};

export default BottomSheetHeader;

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  handle: {
    alignSelf: "center",
    width: layout.bottomSheetHandleWidth,
    height: layout.bottomSheetHandleHeight,
    borderRadius: radius.round,
    backgroundColor: colors.border.strong,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: 'flex-start',
    alignItems: "center",
  },
});
