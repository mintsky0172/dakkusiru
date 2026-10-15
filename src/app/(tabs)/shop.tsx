import { Pressable, StyleSheet, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/colors";
import SimpleBottomSheet from "../../components/common/SimpleBottomSheet";
import BottomSheetHeader from "../../components/common/BottomSheetHeader";
import { PackSortOrder, sortShopPacks } from "../../utils/sortShopPacks";
import React, { useCallback, useMemo, useState } from "react";
import { useEffect } from "react";
import { ShopPack } from "../../types/shop";
import PackCard from "../../components/shop/PackCard";
import Screen from "../../components/common/Screen";
import { AppText } from "../../components/common/AppText";
import AppButton from "../../components/common/AppButton";
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
import ShopCurationSlider from "../../components/shop/ShopCurationSlider";

type PackKindFilter = "all" | "sticker" | "background";
type PackCategoryFilter = "all" | string;
type PackRow = [ShopPack, ShopPack?];
const SHOP_MAIN_PREVIEW_PREFETCH_COUNT = 6;
const SHOP_PREFETCH_PACK_GAP_MS = 80;
const CURATION_PACK_COUNT = 6;
const sortOptions = [
  { value: "name", label: "가나다순" },
  { value: "popular", label: "인기순" },
  { value: "latest", label: "최신등록순" },
] as const;

const kindFilters: { label: string; value: PackKindFilter }[] = [
  { label: "전체", value: "all" },
  { label: "스티커", value: "sticker" },
  { label: "배경", value: "background" },
];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const shufflePacks = (packs: ShopPack[]) => {
  const shuffled = [...packs];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
};

const ShopScreen = () => {
  const insets = useSafeAreaInsets();
  const [sortOrder, setSortOrder] = useState<PackSortOrder>("latest");
  const [isSortMenuVisible, setIsSortMenuVisible] = useState(false);
  const { search } = useLocalSearchParams<{ search?: string | string[] }>();
  const [searchQuery, setSearchQuery] = useState("");

  const loadCoins = useCoinStore((state) => state.loadCoins);
  const [selectedKind, setSelectedKind] = useState<PackKindFilter>("all");
  const [selectedCategory, setSelectedCategory] =
    useState<PackCategoryFilter>("all");
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [curationPackIds, setCurationPackIds] = useState<string[]>([]);

  const packs = useShopPackStore((state) => state.packs);
  const popularityAvailable = packs.length > 0 && packs.every((pack) => pack.acquisitionCount !== undefined);
  useEffect(() => {
    if (!popularityAvailable && sortOrder === "popular") setSortOrder("latest");
  }, [popularityAvailable, sortOrder]);
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

  const sortedPacks = useMemo(
    () => sortShopPacks(filteredPacks, sortOrder),
    [filteredPacks, sortOrder],
  );

  const packRows = useMemo(() => {
    const rows: PackRow[] = [];

    for (let index = 0; index < sortedPacks.length; index += 2) {
      rows.push([sortedPacks[index], sortedPacks[index + 1]]);
    }

    return rows;
  }, [sortedPacks]);

  const resolvedPackIdKey = useMemo(() => {
    return resolvedPacks.map((pack) => pack.id).join("|");
  }, [resolvedPacks]);

  useEffect(() => {
    setCurationPackIds(
      shufflePacks(resolvedPacks)
        .slice(0, CURATION_PACK_COUNT)
        .map((pack) => pack.id),
    );
  }, [resolvedPackIdKey]);

  const curationPacks = useMemo(() => {
    const packsById = new Map(resolvedPacks.map((pack) => [pack.id, pack]));

    return curationPackIds
      .map((packId) => packsById.get(packId))
      .filter((pack): pack is ShopPack => Boolean(pack));
  }, [curationPackIds, resolvedPacks]);

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

            <ShopCurationSlider
              packs={curationPacks}
              onPressPack={handlePressPack}
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
                    label="전체"
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

            <View style={styles.listToolbar}>
              <AppText variant="body">총 {filteredPacks.length}개의 팩</AppText>
              <Pressable
                onPress={() => setIsSortMenuVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="팩 정렬 선택"
                style={styles.sortButton}
              >
                <AppText variant="body">
                  {sortOptions.find((option) => option.value === sortOrder)?.label}
                </AppText>
                <ChevronDown size={16} color={colors.text.primary} />
              </Pressable>
            </View>
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
      <SimpleBottomSheet
        visible={isSortMenuVisible}
        onClose={() => setIsSortMenuVisible(false)}
        contentStyle={{ height: "auto", paddingHorizontal: spacing.lg, paddingBottom: Math.max(insets.bottom, spacing.lg) }}
      >
        <BottomSheetHeader title="정렬" />
        {sortOptions.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: option.value === sortOrder, disabled: option.value === "popular" && !popularityAvailable }}
            disabled={option.value === "popular" && !popularityAvailable}
            onPress={() => {
              setSortOrder(option.value);
              setIsSortMenuVisible(false);
            }}
            style={styles.sortOption}
          >
            <AppText variant="body" style={option.value === "popular" && !popularityAvailable ? styles.disabledSortText : undefined}>
              {option.label}
            </AppText>
            {option.value === sortOrder ? <Check size={18} color={colors.text.primary} /> : null}
          </Pressable>
        ))}
      </SimpleBottomSheet>
    </Screen>
  );
};

export default ShopScreen;

const styles = StyleSheet.create({
  disabledSortText: {
    color: colors.text.muted,
    opacity: 0.5,
  },
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
  listToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 44,
  },
  sortOption: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
