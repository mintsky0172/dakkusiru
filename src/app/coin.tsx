import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useIAP, ErrorCode, getPendingTransactionsIOS, Purchase } from "expo-iap";
import { useEffectiveCoinBalance } from "../hooks/useEffectiveCoinBalance";
import { isAppleBillingReady, verifyAppleCoinPurchase } from "../services/iap/billing";
import { claimPendingGuestPacks, currentShopUserId, ensureShopSession } from "../services/packAcquisitionService";
import { useAuthStore } from "../store/authStore";

const CoinScreen = () => {
  const balance = useEffectiveCoinBalance();
  const loadCoins = useCoinStore((state) => state.loadCoins);
  const userId = useAuthStore((state) => state.user?.id);
  const [billingReady, setBillingReady] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const purchasePending = useRef(false);
  const processing = useRef(new Set<string>());

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
    onPurchaseSuccess: (purchase) => {
      void completePurchase(purchase).catch((error) => {
        Alert.alert("충전 확인 필요", error instanceof Error ? error.message : "충전 확인을 다시 시도해 주세요.");
      }).finally(() => { purchasePending.current = false; setIsPurchasing(false); });
    },
    onPurchaseError: (error) => {
      purchasePending.current = false;
      setIsPurchasing(false);
      if (error.code === ErrorCode.UserCancelled) return;
      Alert.alert("결제 실패", error.message);
    },
    onError: (error) => {
      purchasePending.current = false;
      setIsPurchasing(false);
      Alert.alert("결제 오류", error.message);
    },
  });

  const completePurchase = useCallback(async (purchase: Purchase) => {
    if (Platform.OS !== "ios" || purchase.purchaseState !== "purchased") return;
    const transactionId = purchase.transactionId;
    if (!transactionId || !mockCoinProducts.some(product => product.productId === purchase.productId)) return;
    if (processing.current.has(transactionId)) return;
    processing.current.add(transactionId);
    try {
      const result = await verifyAppleCoinPurchase(transactionId, purchase.productId);
      if (result.userId === await currentShopUserId()) {
        useCoinStore.setState({ balance: result.balance, isLoaded: true });
      }
      // The store transaction is finished only after the server persisted credit.
      await finishTransaction({ purchase, isConsumable: true });
      await loadCoins();
      Alert.alert(result.alreadyCredited ? "충전 확인 완료" : "충전 완료",
        result.alreadyCredited ? "이미 지급된 거래를 확인했어요. 코인은 중복 지급되지 않아요." : `${result.amount.toLocaleString()}코인이 충전되었어요!`);
    } finally { processing.current.delete(transactionId); }
  }, [finishTransaction, loadCoins]);

  const recoverPurchases = useCallback(async () => {
    if (Platform.OS !== "ios") return;
    setIsRecovering(true);
    try {
      const pending = await getPendingTransactionsIOS();
      let lastError: unknown;
      for (const purchase of pending) {
        try { await completePurchase(purchase); }
        catch (error) { lastError = error; }
      }
      if (lastError) throw lastError;
    } catch (error) {
      Alert.alert("충전 확인 필요", error instanceof Error ? error.message : "연결을 확인한 뒤 다시 시도해 주세요.");
    } finally { setIsRecovering(false); }
  }, [completePurchase]);

  useEffect(() => {
    let cancelled = false;
    setBillingReady(false);
    if (Platform.OS === "ios") {
      void isAppleBillingReady().then(ready => { if (!cancelled) setBillingReady(ready); });
    }
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (connected && billingReady) void recoverPurchases();
  }, [connected, billingReady, recoverPurchases]);

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
    if (purchasePending.current || isRecovering || !selectedProduct || !billingReady || !connected) return;
    if (!storeProductsById.has(selectedProduct.productId)) {
      Alert.alert("상품 확인 필요", "스토어에서 상품을 찾지 못했어요.");
      return;
    }
    purchasePending.current = true;
    setIsPurchasing(true);
    try {
      const session = await ensureShopSession();
      await claimPendingGuestPacks();
      if (!await isAppleBillingReady()) throw new Error("현재 충전을 이용할 수 없어요. 잠시 후 다시 시도해 주세요.");
      await requestPurchase({ type: "in-app", request: { apple: {
        sku: selectedProduct.productId,
        appAccountToken: session.user.id,
        quantity: 1,
        andDangerouslyFinishTransactionAutomatically: false,
      } } });
    } catch (error) {
      purchasePending.current = false;
      setIsPurchasing(false);
      Alert.alert("결제 시작 실패", error instanceof Error ? error.message : "다시 시도해 주세요.");
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
            label={!billingReady ? "충전 준비 중" : isPurchasing ? "결제 처리 중..." : `${storeProductsById.get(selectedProduct?.productId ?? "")?.displayPrice ?? ""} 결제하기`}
            onPress={handlePurchase}
            disabled={!selectedProduct || !billingReady || !connected || isPurchasing || isRecovering}
            loading={isPurchasing}
          />
          {Platform.OS === "ios" ? (
            <AppButton label="충전 확인 다시 시도" variant="ghost" onPress={recoverPurchases}
              disabled={!connected || !billingReady || isRecovering || isPurchasing} loading={isRecovering} />
          ) : null}
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
