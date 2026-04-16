import {
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import React from "react";
import { AppText } from "../common/AppText";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";

type PackStatus = "owned" | "free" | "priced";

interface PackCardProps {
  title: string;
  thumbnailSource?: ImageSourcePropType;
  priceLabel?: string;
  status?: PackStatus;
  selected?: boolean;
  onPress?: () => void;
}

const PackCard = ({
  title,
  thumbnailSource,
  priceLabel,
  status = "priced",
  selected = false,
  onPress,
}: PackCardProps) => {
  const statusText =
    status === "owned"
      ? "보유중"
      : status === "free"
        ? "기본"
        : (priceLabel ?? "");

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
      </View>

      <View style={styles.content}>
        <AppText variant="title" numberOfLines={1}>
          {title}
        </AppText>

        <View
          style={[
            styles.badge,
            status === "owned" && styles.ownedBadge,
            status === "free" && styles.freeBadge,
            status === "priced" && styles.priceBadge,
          ]}
        >
          <AppText
            variant="small"
            style={[
              styles.badgeText,
              status === "owned" && styles.ownedBadgeText,
              status === "free" && styles.freeBadgeText,
              status === "priced" && styles.priceBadgeText,
            ]}
          >
            {statusText}
          </AppText>
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
    borderColor: colors.accent.main,
    backgroundColor: '#FFF3EE',
  },
  pressed: {
    opacity: 0.92,
  },
  thumbnailWrapper: {
    width: '100%',
    aspectRatio: 1.18,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background.subtle,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailPlaceholder: {
    flex: 1,
    backgroundColor: colors.background.subtle,
  },
  content: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 14,
  },
  ownedBadge: {
    backgroundColor: '#E7F1E1',
  },
  ownedBadgeText: {
    color: colors.state.success,
  },
  freeBadge: {
    backgroundColor: '#F6E8C8',
  },
  freeBadgeText: {
    color: colors.state.warning,
  },
  priceBadge: {
    backgroundColor: colors.background.subtle,
  },
  priceBadgeText: {
    color: colors.text.secondary
  }
});
