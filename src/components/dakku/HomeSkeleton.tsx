import { StyleSheet, View } from "react-native";
import React from "react";
import SkeletonBox from "../common/SkeletonBox";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";
import { theme } from "../../constants/theme";

const skeletonItems = Array.from({ length: 4 });

const HomeSkeleton = () => {
  return (
    <View style={styles.grid}>
      {skeletonItems.map((_, index) => (
        <View
          key={index}
          style={[
            styles.cardWrapper,
            index % 2 === 0 ? styles.leftCard : styles.rightCard,
          ]}
        >
          <View style={styles.card}>
            <SkeletonBox
              height={theme.card.dakkuThumbnailHeight}
              borderRadius={radius.lg}
            />
            <SkeletonBox height={24} width="72%" style={styles.title} />
            <SkeletonBox height={16} width="58%" style={styles.date} />
          </View>
        </View>
      ))}
    </View>
  );
};

export default HomeSkeleton;

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cardWrapper: {
    width: "50%",
    marginBottom: spacing.md,
  },
  leftCard: {
    paddingRight: spacing.xs,
  },
  rightCard: {
    paddingLeft: spacing.xs,
  },
  card: {
    width: "100%",
    height: theme.card.dakkuHeight,
    backgroundColor: colors.background.base,
    borderWidth: 1,
    borderColor: colors.card.border,
    borderRadius: radius.xl,
    padding: spacing.sm,
  },
  title: {
    marginTop: spacing.sm,
  },
  date: {
    marginTop: 4,
  },
});
