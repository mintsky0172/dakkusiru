import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import React, { useMemo, useState } from "react";
import { mockCoinBalance, mockCoinProducts } from "../mocks/coin";
import { router } from "expo-router";
import Screen from "../components/common/Screen";
import IconButton from "../components/common/IconButton";
import { AppText } from "../components/common/AppText";
import CoinBalanceCard from "../components/shop/CoinBalanceCard";
import CoinProductCard from "../components/shop/CoinProductCard";
import AppButton from "../components/common/AppButton";
import { radius, spacing } from "../constants/spacing";
import { colors } from "../constants/colors";

const CoinScreen = () => {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    mockCoinProducts[1]?.id ?? null,
  );

  const selectedProduct = useMemo(() => {
    return (
      mockCoinProducts.find((item) => item.id === selectedProductId) ?? null
    );
  }, [selectedProductId]);

  const handleBack = () => {
    router.back();
  };

  const handlePurchase = () => {
    if (!selectedProduct) return;

    Alert.alert("코인 상품 결제 시작:", selectedProduct.id);
    // TODO : IAP 연결
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.topBar}>
          <IconButton
            imageSource={require("../../assets/icons/back.png")}
            onPress={handleBack}
            variant="ghost"
            size={40}
            iconSize={20}
          />
          <AppText variant="h1">코인 충전</AppText>
        </View>

        <CoinBalanceCard
          balance={mockCoinBalance}
          showChargeButton={false}
          align="left"
        />

        <View style={styles.section}>
          <AppText variant="title" style={styles.sectionTitle}>
            충전 상품 선택
          </AppText>

          <View style={styles.productList}>
            {mockCoinProducts.map((product) => (
              <CoinProductCard
                key={product.id}
                coinAmount={product.coinAmount}
                priceLabel={product.priceLabel}
                bonusLabel={product.bonusLabel}
                isRecommended={product.isRecommended}
                selected={selectedProductId === product.id}
                onPress={() => setSelectedProductId(product.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.noticeCard}>
          <AppText variant="caption" style={styles.noticeText}>
            코인은 스티커팩 및 배경 구매에 사용할 수 있어요.
          </AppText>
          <AppText variant="caption" style={styles.noticeText}>
            실제 결제는 앱스토어 인앱결제로 진행돼요.
          </AppText>
        </View>

        <View style={styles.bottomAction}>
          <AppButton
            label={
              selectedProduct
                ? `${selectedProduct.priceLabel} 결제하기`
                : "상품을 선택해 주세요"
            }
            onPress={handlePurchase}
            disabled={!selectedProduct}
          />
        </View>
      </ScrollView>
    </Screen>
  );
};

export default CoinScreen;

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    paddingTop: spacing.sm,
    marginBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  productList: {
    gap: spacing.sm,
  },
  noticeCard: {
    marginTop: spacing.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  noticeText: {
    color: colors.text.secondary,
    textAlign: "center",
  },
  bottomAction: {
    marginTop: spacing.xl,
  },
});
