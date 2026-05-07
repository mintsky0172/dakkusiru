import { StyleSheet, Text, View } from "react-native";
import React from "react";
import SkeletonBox from "../common/SkeletonBox";
import { spacing } from "../../constants/spacing";

const PackDetailSkeleton = () => {
  return (
    <View style={styles.container}>
      <SkeletonBox height={220} borderRadius={24} />

      <SkeletonBox height={30} width="60%" />
      <SkeletonBox height={18} width="85%" />
      <SkeletonBox height={18} width="70%" />

      <View style={styles.previewGrid}>
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBox key={index} width="30%" height={88} borderRadius={16} />
        ))}
      </View>

      <SkeletonBox height={48} borderRadius={16} style={{ marginTop: 8 }} />
    </View>
  );
};

export default PackDetailSkeleton;

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
});
