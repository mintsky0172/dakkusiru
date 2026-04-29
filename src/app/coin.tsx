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

const CoinScreen = () => {
  const balance = useCoinStore((state) => state.balance);
  const loadCoins = useCoinStore((state) => state.loadCoins);
  const chargeCoins = useCoinStore((state) => state.chargeCoins);
  const [isPurchasing, setIsPurchasing] = useState(false);

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
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      const productId = purchase.productId ?? purchase.id;

      const coinProduct = mockCoinProducts.find(
        (item) => item.productId === productId,
      );

      if (!coinProduct) return;

      const totalAmount =
        coinProduct.coinAmount + (coinProduct.bonusAmount ?? 0);

      // TODO : 서버 검증 추가(IAP 성공 -> 영수증/구매 토큰을 Supabase Edge Function으로 전송 -> 서버 검증 -> 검증 성공 시 coin_ledger 기록 -> 앱에서 잔액 갱신 )
      await chargeCoins({
        amount: totalAmount,
        description: `${totalAmount.toLocaleString()}코인 충전`,
      });

      await finishTransaction({
        purchase,
        isConsumable: true,
      });

      Alert.alert(
        "충전 완료",
        `${totalAmount.toLocaleString()}코인이 충전되었어요!`,
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

  const handlePurchase = async () => {
    if (!selectedProduct || isPurchasing) return;

    if (!connected) {
      Alert.alert("결제 준비 중", "스토어 연결 후 다시 시도해 주세요.");
      return;
    }

    try {
      setIsPurchasing(true);
      await requestPurchase({
        request: {
          apple: {
            sku: selectedProduct.productId,
          },
          google: {
            skus: [selectedProduct.productId],
          },
        },
        type: "in-app",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "결제를 시작하는 중 오류가 발생했어요.";
      Alert.alert("결제 실패", message);
    } finally {
      setIsPurchasing(false);
    }
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
            label={
              selectedProduct
                ? `${
                    storeProductsById.get(selectedProduct.productId)
                      ?.displayPrice ?? selectedProduct.priceLabel
                  } 결제하기`
                : "상품을 선택해 주세요"
            }
            onPress={handlePurchase}
            disabled={!selectedProduct || !connected || isPurchasing}
            loading={isPurchasing}
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
