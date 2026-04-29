import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import React, { use, useCallback, useMemo, useState } from "react";
import { mockCoinBalance, mockPacks } from "../../mocks/shop";
import { ShopPack, StickerPack } from "../../types/shop";
import PackCard from "../../components/shop/PackCard";
import Screen from "../../components/common/Screen";
import { AppText } from "../../components/common/AppText";
import CoinBalanceCard from "../../components/shop/CoinBalanceCard";
import Chip from "../../components/common/Chip";
import { spacing } from "../../constants/spacing";
import { router, useFocusEffect } from "expo-router";
import { usePurchaseStore } from "../../store/purchaseStore";
import { resolvePacks } from "../../utils/shop";

type CategoryFilter = "all" | "sticker" | "background";

const categories: { label: string; value: CategoryFilter }[] = [
  { label: "전체", value: "all" },
  { label: "스티커", value: "sticker" },
  { label: "배경", value: "background" },
];

const ShopScreen = () => {
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  const ownedPackIds = usePurchaseStore((state) => state.ownedPackIds);
  const loadOwnedPackIds = usePurchaseStore((state) => state.loadOwnedPackIds);

  useFocusEffect(
    useCallback(() => {
      void loadOwnedPackIds();
    }, [loadOwnedPackIds]),
  );

  const resolvedPacks = useMemo(() => {
    return resolvePacks(mockPacks, ownedPackIds);
  }, [ownedPackIds]);

  const filteredPacks = useMemo(() => {
    if (selectedCategory === "all") return resolvedPacks;
    return resolvedPacks.filter((pack) => pack.kind === selectedCategory);
  }, [resolvedPacks, selectedCategory]);

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
          priceLabel={item.priceLabel}
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
              balance={mockCoinBalance}
              onPressCharge={handlePressCharge}
            />

            <View style={styles.categoryRow}>
              {categories.map((category) => (
                <Chip
                  key={category.value}
                  label={category.label}
                  selected={selectedCategory === category.value}
                  onPress={() => setSelectedCategory(category.value)}
                  style={styles.chip}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <AppText variant="h3">조건에 맞는 팩이 없어요.</AppText>
            <AppText variant="caption" style={styles.emptyDescription}>
              다른 카테고리를 선택해 보세요.
            </AppText>
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
    marginBottom: spacing.lg,
  },
  chip: {
    marginRight: 0,
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
});
