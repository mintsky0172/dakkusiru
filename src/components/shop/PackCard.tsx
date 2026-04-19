import {
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
  Image,
} from "react-native";
import React from "react";
import { AppText } from "../common/AppText";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";
import { PackOwnStatus, PackStatus } from "../../types/shop";

interface PackCardProps {
  title: string;
  thumbnailSource?: ImageSourcePropType;
  priceLabel?: string;
  status?: PackStatus;
  ownStatus?: PackOwnStatus;
  selected?: boolean;
  isNew?: boolean;
  onPress?: () => void;
}

const PackCard = ({
  title,
  thumbnailSource,
  priceLabel,
  status = "priced",
  ownStatus = "not_owned",
  selected = false,
  isNew = false,
  onPress,
}: PackCardProps) => {
  const statusText = status === "free" ? "무료" : (priceLabel ?? "");

  const ownStatusText = ownStatus === "owned" ? "보유중" : "";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selectedCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.thumbnailWrapper}>
        {thumbnailSource ? (
          <Image source={thumbnailSource} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder} />
        )}

        {isNew ? (
          <View style={styles.newBadge}>
            <AppText variant="small" style={styles.newBadgeText}>
              신규
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <AppText variant="title" numberOfLines={1}>
          {title}
        </AppText>

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              status === "free" && styles.freeBadge,
              status === "priced" && styles.priceBadge,
            ]}
          >
            <Image
              source={require("../../../assets/icons/coin.png")}
              style={{ width: 20, height: 20 }}
            />
            <AppText
              variant="small"
              style={[
                styles.badgeText,

                status === "free" && styles.freeBadgeText,
                status === "priced" && styles.priceBadgeText,
              ]}
            >
              {statusText}
            </AppText>
          </View>
          <View
            style={[styles.badge, ownStatus === "owned" && styles.ownedBadge]}
          >
            <AppText
              variant="small"
              style={[
                styles.badgeText,
                ownStatus === "owned" && styles.ownedBadgeText,
              ]}
            >
              {ownStatusText}
            </AppText>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default PackCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
    borderRadius: radius.xl,
    padding: spacing.sm,
  },
  selectedCard: {
    borderColor: colors.border.strong,
    backgroundColor: "#FFF3EE",
  },
  pressed: {
    opacity: 0.92,
  },
  thumbnailWrapper: {
    width: "100%",
    aspectRatio: 1.18,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.background.subtle,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbnailPlaceholder: {
    flex: 1,
    backgroundColor: colors.background.subtle,
  },
  newBadge: {
    position: "absolute",
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.state.warning,
    borderRadius: radius.round,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  newBadgeText: {
    color: colors.text.inverse,
    fontSize: 10,
    lineHeight: 12,
  },
  content: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  badge: {
    flexDirection: "row",
    alignSelf: "flex-start",
    borderRadius: radius.round,
    paddingVertical: 4,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 14,
  },
  ownedBadge: {
    backgroundColor: "#E7F1E1",
    paddingHorizontal: 7 
  },
  ownedBadgeText: {
    color: colors.state.success,
  },
  freeBadge: {
    backgroundColor: "transparent",
  },
  freeBadgeText: {
    color: colors.text.primary,
  },
  priceBadge: {
    backgroundColor: "transparent",
  },
  priceBadgeText: {
    color: colors.text.secondary,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
