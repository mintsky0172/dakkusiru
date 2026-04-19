import { Pressable, StyleSheet, Image, View } from "react-native";
import React from "react";
import { AppText } from "../common/AppText";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";

interface CoinProductCardProps {
  coinAmount: number;
  priceLabel: string;
  bonusLabel?: string;
  isRecommended?: boolean;
  selected?: boolean;
  onPress?: () => void;
}

const CoinProductCard = ({
  coinAmount,
  priceLabel,
  bonusLabel,
  isRecommended = false,
  selected = false,
  onPress,
}: CoinProductCardProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selectedCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.left}>
        <View style={styles.coinRow}>
          <Image
            source={require("../../../assets/icons/coin.png")}
            style={{ width: 20, height: 20 }}
          />
          <AppText variant="title">{coinAmount.toLocaleString()}코인</AppText>
          {bonusLabel ? (
            <View style={styles.bonusBadge}>
              <AppText variant="small" style={styles.bonusText}>
                {bonusLabel}
              </AppText>
            </View>
          ) : null}
        </View>

        {isRecommended ? (
          <View style={styles.recommendedBadge}>
            <AppText variant="small" style={styles.recommendedText}>
              추천
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.right}>
        <AppText variant="title" style={styles.priceText}>
          {priceLabel}
        </AppText>
      </View>
    </Pressable>
  );
};

export default CoinProductCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  selectedCard: {
    borderColor: colors.accent.main,
    backgroundColor: "#FFF3EE",
  },
  pressed: {
    opacity: 0.92,
  },
  left: {
    flex: 1,
  },
  coinRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
  },
  bonusBadge: {
    backgroundColor: "#FDE8D8",
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.round,
  },
  bonusText: {
    color: colors.accent.strong,
    fontSize: 10,
    lineHeight: 12,
  },
  recommendedBadge: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    backgroundColor: "#E7F1E1",
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.round,
  },
  recommendedText: {
    color: colors.state.success,
    fontSize: 10,
    lineHeight: 12,
  },
  right: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  priceText: {
    color: colors.text.primary,
  },
});
