import { StyleSheet, Text, View } from "react-native";
import React from "react";
import SkeletonBox from "../common/SkeletonBox";
import { spacing } from "../../constants/spacing";

const ShopSkeleton = () => {
  return (
    <View style={styles.container}>
      <SkeletonBox height={110} borderRadius={24} />

      <View style={styles.chips}>
        <SkeletonBox width={64} height={36} borderRadius={18} />
        <SkeletonBox width={64} height={36} borderRadius={18} />
        <SkeletonBox width={64} height={36} borderRadius={18} />
        <SkeletonBox width={64} height={36} borderRadius={18} />
      </View>

      <View style={styles.grid}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.card}>
            <SkeletonBox height={140} borderRadius={18} />
            <SkeletonBox height={24} width="70%" style={{ marginTop: 12 }} />
            <SkeletonBox height={20} width="35%" style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    </View>
  );
};

export default ShopSkeleton;

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  chips: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  card: {
    width: "48%",
  },
});
