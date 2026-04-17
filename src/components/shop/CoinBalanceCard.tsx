import { Image, StyleSheet, Text, View } from "react-native";
import React from "react";
import { AppText } from "../common/AppText";
import AppButton from "../common/AppButton";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";

interface CoinBalanceCardProps {
  balance: number;
  onPressCharge?: () => void;
}

const CoinBalanceCard = ({ balance, onPressCharge }: CoinBalanceCardProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <AppText variant="caption">보유 코인</AppText>
        <View style={styles.coinRow}>
          <Image
            source={require("../../../assets/icons/coin.png")}
            style={styles.coinIcon}
          />
          <AppText variant="h2" style={styles.balance}>
            {balance.toLocaleString()}
          </AppText>
        </View>
      </View>

      <View style={styles.buttonWrapper}>
        <AppButton label="충전" onPress={onPressCharge} variant="primary" />
      </View>
    </View>
  );
};

export default CoinBalanceCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  left: {
    flex: 1,
  },
  balance: {
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  buttonWrapper: {
    minWidth: 88,
  },
  coinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  coinIcon: {
    width: 20,
    height: 20,
  },
});
