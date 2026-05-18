import { StyleSheet, View } from "react-native";
import React, { useCallback, useMemo, useState } from "react";
import { useEffect } from "react";
import { ShopPack } from "../../types/shop";
import PackCard from "../../components/shop/PackCard";
import Screen from "../../components/common/Screen";
import { AppText } from "../../components/common/AppText";
import AppButton from "../../components/common/AppButton";
import CoinBalanceCard from "../../components/shop/CoinBalanceCard";
import Chip from "../../components/common/Chip";
import { spacing } from "../../constants/spacing";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { usePurchaseStore } from "../../store/purchaseStore";
import { resolvePacks } from "../../utils/shop";
import { useCoinStore } from "../../store/coinStore";
import { useShopPackStore } from "../../store/shopPackStore";
import {
  backgroundCategoryOptions,
  packCategoryLabelMap,
  stickerCategoryOptions,
} from "../../constants/packCategories";
import { prefetchImageSources } from "../../utils/prefetchImageSources";
import { FlashList } from "@shopify/flash-list";
import { getPackPreviewImageSources } from "../../utils/getPackPreviewImageSources";
import ShopSkeleton from "../../components/shop/ShopSkeleton";
import SearchInput from "../../components/common/SearchInput";
import { useEffectiveCoinBalance } from "../../hooks/useEffectiveCoinBalance";

type PackKindFilter = "all" | "sticker" | "background";
type PackCategoryFilter = "all" | string;
type PackRow = [ShopPack, ShopPack?];
const SHOP_MAIN_PREVIEW_PREFETCH_COUNT = 6;
const SHOP_PREFETCH_PACK_GAP_MS = 80;

const kindFilters: { label: string; value: PackKindFilter }[] = [
  { label: "전체", value: "all" },
  { label: "스티커", value: "sticker" },
  { label: "배경", value: "background" },
];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ShopScreen = () => {
  const { search } = useLocalSearchParams<{ search?: string | string[] }>();
  const [searchQuery, setSearchQuery] = useState("");

  const balance = useEffectiveCoinBalance();
  const loadCoins = useCoinStore((state) => state.loadCoins);
  const [selectedKind, setSelectedKind] = useState<PackKindFilter>("all");
  const [selectedCategory, setSelectedCategory] =
    useState<PackCategoryFilter>("all");
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  const packs = useShopPackStore((state) => state.packs);
  const isPackLoading = useShopPackStore((state) => state.isLoading);
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

  useEffect(() => {
    const nextSearchQuery = Array.isArray(search) ? search[0] : search;

    if (typeof nextSearchQuery !== "string") return;

    setSearchQuery(nextSearchQuery);
    setSelectedKind("all");
    setSelectedCategory("all");
  }, [search]);

  const resolvedPacks = useMemo(() => {
    return resolvePacks(
      packs.filter((pack) => pack.isActive !== false),
      ownedPackIds,
    );
  }, [packs, ownedPackIds]);

  const categoryFilters = useMemo(() => {
    if (selectedKind === "sticker") return stickerCategoryOptions;
    if (selectedKind === "background") return backgroundCategoryOptions;
    return [];
  }, [selectedKind]);

  const filteredPacks = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return resolvedPacks.filter((pack) => {
      if (selectedKind !== "all" && pack.kind !== selectedKind) return false;
      if (
        selectedKind !== "all" &&
        selectedCategory !== "all" &&
        pack.category !== selectedCategory
      ) {
        return false;
      }
      if (!keyword) return true;

      const searchableText = [pack.title, pack.category, ...(pack.tags ?? [])]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [resolvedPacks, selectedCategory, selectedKind, searchQuery]);

  const packRows = useMemo(() => {
    const rows: PackRow[] = [];

    for (let index = 0; index < filteredPacks.length; index += 2) {
      rows.push([filteredPacks[index], filteredPacks[index + 1]]);
    }

    return rows;
  }, [filteredPacks]);

  useEffect(() => {
    let isCancelled = false;

    prefetchImageSources(filteredPacks.map((pack) => pack.thumbnailSource));

    const timeoutId = setTimeout(() => {
      void (async () => {
        for (const pack of filteredPacks) {
          if (isCancelled) break;

          await prefetchImageSources(
            getPackPreviewImageSources(pack, SHOP_MAIN_PREVIEW_PREFETCH_COUNT),
          );
          await wait(SHOP_PREFETCH_PACK_GAP_MS);
        }
      })();
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [filteredPacks]);

  const handlePressCharge = () => {
    router.push("/coin");
  };

  const handlePressPack = (pack: ShopPack) => {
    setSelectedPackId(pack.id);
    router.push(`/shop/${pack.id}`);
  };

  const renderPackRow = ({ item }: { item: PackRow }) => {
    const [leftPack, rightPack] = item;

    return (
      <View style={styles.packRow}>
        <View style={[styles.cardWrapper, styles.leftCard]}>
          <PackCard
            title={leftPack.title}
            thumbnailSource={leftPack.thumbnailSource}
            status={leftPack.status}
            priceLabel={leftPack.coinPrice}
            ownStatus={leftPack.ownStatus}
            isNew={leftPack.isNew}
            selected={selectedPackId === leftPack.id}
            style={styles.packCard}
            onPress={() => handlePressPack(leftPack)}
          />
        </View>

        <View style={[styles.cardWrapper, styles.rightCard]}>
          {rightPack ? (
            <PackCard
              title={rightPack.title}
              thumbnailSource={rightPack.thumbnailSource}
              status={rightPack.status}
              priceLabel={rightPack.coinPrice}
              ownStatus={rightPack.ownStatus}
              isNew={rightPack.isNew}
              selected={selectedPackId === rightPack.id}
              style={styles.packCard}
              onPress={() => handlePressPack(rightPack)}
            />
          ) : null}
        </View>
      </View>
    );
  };

  const shouldShowSkeleton = isPackLoading && packs.length === 0;

  if (shouldShowSkeleton) {
    return (
      <Screen>
        <ShopSkeleton />
      </Screen>
    );
  }
  return (
    <Screen>
      <FlashList
        data={packRows}
        keyExtractor={(item) => item.map((pack) => pack?.id).join("-")}
        renderItem={renderPackRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <AppText variant="h1">상점</AppText>
              <View style={styles.searchWrapper}>
                <SearchInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="팩 이름 또는 태그 검색"
                />
              </View>
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
              {searchQuery ? "검색 결과가 없어요." : "조건에 맞는 팩이 없어요."}
            </AppText>
            <AppText variant="caption" style={styles.emptyDescription}>
              {searchQuery
                ? "다른 검색어를 입력해 보세요."
                : "다른 카테고리를 선택해 보세요."}
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
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xxxl,
  },
  searchWrapper: {
    flex: 1,
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
  packRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: spacing.md,
  },
  cardWrapper: {
    width: "50%",
    alignSelf: "stretch",
  },
  packCard: {
    flex: 1,
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
