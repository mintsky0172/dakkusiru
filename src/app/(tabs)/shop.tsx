import { FlatList, StyleSheet, View } from "react-native";
import React, { useCallback, useMemo, useState } from "react";
import { ShopPack } from "../../types/shop";
import PackCard from "../../components/shop/PackCard";
import Screen from "../../components/common/Screen";
import { AppText } from "../../components/common/AppText";
import AppButton from "../../components/common/AppButton";
import CoinBalanceCard from "../../components/shop/CoinBalanceCard";
import Chip from "../../components/common/Chip";
import { spacing } from "../../constants/spacing";
import { router, useFocusEffect } from "expo-router";
import { usePurchaseStore } from "../../store/purchaseStore";
import { resolvePacks } from "../../utils/shop";
import { useCoinStore } from "../../store/coinStore";
import { useShopPackStore } from "../../store/shopPackStore";
import {
  backgroundCategoryOptions,
  packCategoryLabelMap,
  stickerCategoryOptions,
} from "../../constants/packCategories";

type PackKindFilter = "all" | "sticker" | "background";
type PackCategoryFilter = "all" | string;

const kindFilters: { label: string; value: PackKindFilter }[] = [
  { label: "전체", value: "all" },
  { label: "스티커", value: "sticker" },
  { label: "배경", value: "background" },
];

const ShopScreen = () => {
  const balance = useCoinStore((state) => state.balance);
  const loadCoins = useCoinStore((state) => state.loadCoins);
  const [selectedKind, setSelectedKind] = useState<PackKindFilter>("all");
  const [selectedCategory, setSelectedCategory] =
    useState<PackCategoryFilter>("all");
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  const packs = useShopPackStore((state) => state.packs);
  const errorMessage = useShopPackStore((state) => state.errorMessage);
  const loadPacks = useShopPackStore((state) => state.loadPacks);

  const ownedPackIds = usePurchaseStore((state) => state.ownedPackIds);
  const loadOwnedPackIds = usePurchaseStore((state) => state.loadOwnedPackIds);

  useFocusEffect(
    useCallback(() => {
      void loadPacks();
      void loadOwnedPackIds();
      void loadCoins();
    }, [loadPacks, loadOwnedPackIds, loadCoins]),
  );

  const resolvedPacks = useMemo(() => {
    return resolvePacks(packs, ownedPackIds);
  }, [packs, ownedPackIds]);

  const categoryFilters = useMemo(() => {
    if (selectedKind === "sticker") return stickerCategoryOptions;
    if (selectedKind === "background") return backgroundCategoryOptions;
    return [];
  }, [selectedKind]);

  const filteredPacks = useMemo(() => {
    return resolvedPacks.filter((pack) => {
      if (selectedKind !== "all" && pack.kind !== selectedKind) return false;
      if (
        selectedKind !== "all" &&
        selectedCategory !== "all" &&
        pack.category !== selectedCategory
      ) {
        return false;
      }
      return true;
    });
  }, [resolvedPacks, selectedCategory, selectedKind]);

  const handlePressCharge = () => {
    router.push("/coin");
  };

  const handlePressPack = (pack: ShopPack) => {
    setSelectedPackId(pack.id);
    router.push(`/shop/${pack.id}`);
  };

  const renderPackItem = ({
    item,
    index,
  }: {
    item: ShopPack;
    index: number;
  }) => {
    return (
      <View
        style={[
          styles.cardWrapper,
          index % 2 === 0 ? styles.leftCard : styles.rightCard,
        ]}
      >
        <PackCard
          title={item.title}
          thumbnailSource={item.thumbnailSource}
          status={item.status}
          priceLabel={item.coinPrice}
          ownStatus={item.ownStatus}
          isNew={item.isNew}
          selected={selectedPackId === item.id}
          onPress={() => handlePressPack(item)}
        />
      </View>
    );
  };
  return (
    <Screen>
      <FlatList
        data={filteredPacks}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderPackItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <AppText variant="h1">상점</AppText>
            </View>

            <CoinBalanceCard
              balance={balance}
              onPressCharge={handlePressCharge}
            />

            <View style={styles.categoryRow}>
              {kindFilters.map((category) => (
                <Chip
                  key={category.value}
                  label={category.label}
                  selected={selectedKind === category.value}
                  onPress={() => {
                    setSelectedKind(category.value);
                    setSelectedCategory("all");
                  }}
                  style={styles.chip}
                />
              ))}
            </View>

            {selectedKind !== "all" ? (
              <View style={styles.categoryFilterBox}>
                <AppText variant="caption" style={styles.categoryFilterLabel}>
                  카테고리
                </AppText>
                <View style={styles.categoryFilterRow}>
                  <Chip
                    label="전체 카테고리"
                    selected={selectedCategory === "all"}
                    onPress={() => setSelectedCategory("all")}
                  />
                  {categoryFilters.map((category) => (
                    <Chip
                      key={category}
                      label={packCategoryLabelMap[category] ?? category}
                      selected={selectedCategory === category}
                      onPress={() => setSelectedCategory(category)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <AppText variant="body" style={styles.packCountText}>
              총 {filteredPacks.length}개의 팩
            </AppText>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <AppText variant="h3">
              {errorMessage
                ? "팩 목록을 불러오지 못했어요."
                : "조건에 맞는 팩이 없어요."}
            </AppText>
            <AppText variant="caption" style={styles.emptyDescription}>
              {errorMessage ?? "다른 카테고리를 선택해 보세요."}
            </AppText>
            {errorMessage ? (
              <View style={styles.retryButtonWrapper}>
                <AppButton label="다시 시도" onPress={() => void loadPacks()} />
              </View>
            ) : null}
          </View>
        }
      />
    </Screen>
  );
};

export default ShopScreen;

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  chip: {
    marginRight: 0,
  },
  categoryFilterBox: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  categoryFilterLabel: {
    opacity: 0.8,
  },
  categoryFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  packCountText: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
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
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyDescription: {
    marginTop: spacing.xs,
  },
  retryButtonWrapper: {
    marginTop: spacing.md,
  },
});
