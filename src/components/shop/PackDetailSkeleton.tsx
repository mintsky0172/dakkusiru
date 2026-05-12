import { StyleSheet, View } from "react-native";
import React from "react";
import SkeletonBox from "../common/SkeletonBox";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";

const previewSkeletonItems = Array.from({ length: 6 });

const PackDetailSkeleton = () => {
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <SkeletonBox width={40} height={40} borderRadius={20} />
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroImageWrapper}>
          <SkeletonBox width="84%" height={230} borderRadius={radius.lg} />
        </View>

        <View style={styles.heroTextArea}>
          <View style={styles.titleRow}>
            <SkeletonBox height={30} width="58%" borderRadius={12} />
            <SkeletonBox height={24} width={44} borderRadius={radius.round} />
          </View>
          <SkeletonBox
            height={16}
            width="88%"
            borderRadius={8}
            style={styles.descriptionLine}
          />
          <SkeletonBox
            height={16}
            width="66%"
            borderRadius={8}
            style={styles.descriptionLine}
          />
          <View style={styles.statusRow}>
            <SkeletonBox height={28} width={64} borderRadius={radius.round} />
            <SkeletonBox height={28} width={82} borderRadius={radius.round} />
          </View>
        </View>
      </View>

      <View style={styles.actionSection}>
        <SkeletonBox height={52} borderRadius={radius.lg} />
      </View>

      <View style={styles.lengthRow}>
        <SkeletonBox height={24} width={104} borderRadius={10} />
        <SkeletonBox height={20} width={36} borderRadius={10} />
      </View>

      <View style={styles.previewGrid}>
        {previewSkeletonItems.map((_, index) => (
          <View key={index} style={styles.previewCell}>
            <SkeletonBox height={88} borderRadius={radius.lg} />
            <SkeletonBox
              height={14}
              width="68%"
              borderRadius={7}
              style={styles.previewLabel}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

export default PackDetailSkeleton;

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    paddingTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  heroCard: {
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
    borderRadius: radius.xxl,
    padding: spacing.md,
  },
  heroImageWrapper: {
    width: "100%",
    aspectRatio: 1.1,
    borderRadius: radius.xl,
    backgroundColor: colors.background.subtle,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  heroTextArea: {
    marginTop: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  descriptionLine: {
    marginTop: spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    marginTop: spacing.sm,
    gap: 10,
  },
  actionSection: {
    marginTop: spacing.lg,
  },
  lengthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  previewCell: {
    width: "33.333%",
    paddingHorizontal: spacing.xxs,
    marginBottom: spacing.md,
  },
  previewLabel: {
    alignSelf: "center",
    marginTop: spacing.xs,
  },
});
