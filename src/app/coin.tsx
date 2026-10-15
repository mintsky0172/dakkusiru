import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { mockCoinProducts } from "../mocks/coin";
import { router } from "expo-router";
import Screen from "../components/common/Screen";
import IconButton from "../components/common/IconButton";
import { AppText } from "../components/common/AppText";
import CoinBalanceCard from "../components/shop/CoinBalanceCard";
import CoinProductCard from "../components/shop/CoinProductCard";
import AppButton from "../components/common/AppButton";
import { spacing } from "../constants/spacing";
import { colors } from "../constants/colors";
import { useCoinStore } from "../store/coinStore";
import { useIAP, ErrorCode } from "expo-iap";
import { useEffectiveCoinBalance } from "../hooks/useEffectiveCoinBalance";

const CoinScreen = () => {
  const balance = useEffectiveCoinBalance();
  const loadCoins = useCoinStore((state) => state.loadCoins);

  useEffect(() => {
    void loadCoins();
  }, [loadCoins]);

  const coinProductIds = useMemo(
    () => mockCoinProducts.map((item) => item.productId),
    [],
  );

  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    mockCoinProducts[1]?.id ?? null,
  );

  const selectedProduct = useMemo(() => {
    return (
      mockCoinProducts.find((item) => item.id === selectedProductId) ?? null
    );
  }, [selectedProductId]);

  const {
    connected,
    products,
    fetchProducts,
  } = useIAP({
    onPurchaseSuccess: () => {
      // Do not consume unfinished purchases before receipt verification exists.
      Alert.alert(
        "충전 확인 필요",
        "결제 확인을 완료하지 못했어요. 추가 결제 없이 고객 지원으로 문의해 주세요.",
      );
    },
    onPurchaseError: (error) => {
      if (error.code === ErrorCode.UserCancelled) return;
      Alert.alert("결제 실패", error.message);
    },
    onError: (error) => {
      Alert.alert("결제 오류", error.message);
    },
  });

  const storeProductsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  useEffect(() => {
    if (!connected) return;

    void fetchProducts({
      skus: coinProductIds,
      type: "in-app",
    });
  }, [coinProductIds, connected, fetchProducts]);

  const handleBack = () => {
    router.back();
  };

  const handlePurchase = () => {
    Alert.alert("충전 준비 중", "현재 코인 충전을 준비하고 있어요. 잠시 후 다시 이용해 주세요.");
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
          balance={balance}
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
                priceLabel={
                  storeProductsById.get(product.productId)?.displayPrice ??
                  product.priceLabel
                }
                bonusLabel={
                  product.bonusAmount
                    ? `+${product.bonusAmount} 보너스`
                    : undefined
                }
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
            label="충전 준비 중"
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
