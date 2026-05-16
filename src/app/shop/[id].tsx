import { Alert, StyleSheet, Image, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import { router, useLocalSearchParams } from "expo-router";
import Screen from "../../components/common/Screen";
import { AppText } from "../../components/common/AppText";
import { radius, spacing } from "../../constants/spacing";
import AppButton from "../../components/common/AppButton";
import IconButton from "../../components/common/IconButton";
import StickerPreviewCard from "../../components/shop/StickerPreviewCard";
import SkeletonBox from "../../components/common/SkeletonBox";
import { colors } from "../../constants/colors";
import { usePurchaseStore } from "../../store/purchaseStore";
import { useCoinStore } from "../../store/coinStore";
import { useShopPackStore } from "../../store/shopPackStore";
import { resolvePack } from "../../utils/shop";
import { prefetchImageSources } from "../../utils/prefetchImageSources";
import { PackPreviewBackground, PackPreviewSticker } from "../../types/shop";
import { getPackPreviewImageSources } from "../../utils/getPackPreviewImageSources";
import PackDetailSkeleton from "../../components/shop/PackDetailSkeleton";
import Chip from "../../components/common/Chip";

const INITIAL_PREVIEW_COUNT = 6;
const LOAD_MORE_PREVIEW_COUNT = 18;
const MORE_PREVIEW_BATCH_SIZE = 6;
const MORE_PREVIEW_PREFETCH_GAP_MS = 80;
const TAIL_PREVIEW_PREFETCH_COUNT = 6;
const INITIAL_PREVIEW_PREFETCH_TIMEOUT_MS = 900;
const MIN_INITIAL_SKELETON_MS = 160;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PackDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [previewRenderLimit, setPreviewRenderLimit] = useState(
    INITIAL_PREVIEW_COUNT,
  );
  const [isShowingMorePreviewItems, setIsShowingMorePreviewItems] =
    useState(false);
  const [isInitialPreviewReady, setIsInitialPreviewReady] = useState(false);

  const balance = useCoinStore((state) => state.balance);
  const loadCoins = useCoinStore((state) => state.loadCoins);
  const spendCoins = useCoinStore((state) => state.spendCoins);

  const ownedPackIds = usePurchaseStore((state) => state.ownedPackIds);
  const loadOwnedPackIds = usePurchaseStore((state) => state.loadOwnedPackIds);
  const markPackAsOwned = usePurchaseStore((state) => state.markPackAsOwned);

  const packs = useShopPackStore((state) => state.packs);
  const isPackLoading = useShopPackStore((state) => state.isLoading);
  const loadPacks = useShopPackStore((state) => state.loadPacks);
  const [hasFinishedInitialPackLoad, setHasFinishedInitialPackLoad] = useState(
    packs.length > 0,
  );

  const rawPack = useMemo(() => {
    return packs.find((item) => item.id === id);
  }, [id, packs]);

  const pack = useMemo(() => {
    if (!rawPack) return null;
    return resolvePack(rawPack, ownedPackIds);
  }, [rawPack, ownedPackIds]);

  const previewItems = useMemo(() => {
    if (!pack) return [];
    return pack.kind === "sticker"
      ? pack.previewStickers
      : (pack.previewBackgrounds ?? []);
  }, [pack]);

  useEffect(() => {
    void loadOwnedPackIds();
    void loadCoins();

    if (packs.length > 0) {
      setHasFinishedInitialPackLoad(true);
      return;
    }

    let isCancelled = false;
    setHasFinishedInitialPackLoad(false);

    void loadPacks().finally(() => {
      if (!isCancelled) {
        setHasFinishedInitialPackLoad(true);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [loadCoins, loadOwnedPackIds, loadPacks, packs.length]);

  const renderedPreviewItems = useMemo(() => {
    return previewItems.slice(0, previewRenderLimit);
  }, [previewItems, previewRenderLimit]);

  useEffect(() => {
    setPreviewRenderLimit(INITIAL_PREVIEW_COUNT);
    setIsShowingMorePreviewItems(false);
    setIsInitialPreviewReady(false);
  }, [pack?.id]);

  useEffect(() => {
    if (!pack) return;

    let isCancelled = false;

    void Promise.all([
      Promise.race([
        prefetchImageSources([
          pack.thumbnailSource,
          ...getPackPreviewImageSources(pack, INITIAL_PREVIEW_COUNT),
        ]) ?? Promise.resolve(false),
        wait(INITIAL_PREVIEW_PREFETCH_TIMEOUT_MS),
      ]),
      wait(MIN_INITIAL_SKELETON_MS),
    ])
      .catch(() => undefined)
      .finally(() => {
        if (!isCancelled) {
          setIsInitialPreviewReady(true);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [pack]);

  useEffect(() => {
    if (!pack || !isInitialPreviewReady) return;

    if (previewItems.length <= INITIAL_PREVIEW_COUNT) return;

    let isCancelled = false;
    const timeoutId = setTimeout(() => {
      void (async () => {
        void prefetchImageSources(
          previewItems
            .slice(-TAIL_PREVIEW_PREFETCH_COUNT)
            .map((item) => item.imageSource),
          "memory-disk",
        );

        for (
          let index = INITIAL_PREVIEW_COUNT;
          index < previewItems.length;
          index += MORE_PREVIEW_BATCH_SIZE
        ) {
          if (isCancelled) break;

          await prefetchImageSources(
            previewItems
              .slice(index, index + MORE_PREVIEW_BATCH_SIZE)
              .map((item) => item.imageSource),
            "memory-disk",
          );
          await wait(MORE_PREVIEW_PREFETCH_GAP_MS);
        }
      })();
    }, 120);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isInitialPreviewReady, pack, previewItems]);

  const handleBack = () => {
    router.back();
  };

  const handlePrimaryAction = async () => {
    if (!pack) return;

    if (pack.ownStatus === "owned") {
      Alert.alert("이 팩 사용하기:", pack.id);
      // TODO: 나중엔 editor 쪽으로 연결
      return;
    }

    if (pack.status === "free") {
      await markPackAsOwned(pack.id);
      Alert.alert("다운로드 완료", `${pack.title}을 사용할 수 있어요!`);
      return;
    }

    const coinPrice = Number(String(pack.coinPrice ?? 0).replace(/,/g, ""));

    if (balance < coinPrice) {
      Alert.alert("코인이 부족해요", "코인을 충전한 뒤 다시 구매해 주세요.", [
        { text: "취소", style: "cancel" },
        {
          text: "코인 충전하기",
          onPress: () => router.push("/coin"),
        },
      ]);
      return;
    }

    const success = await spendCoins({
      amount: coinPrice,
      description: `${pack.title} 구매`,
    });

    if (!success) {
      Alert.alert("구매 실패", "코인이 부족해요.");
      return;
    }

    await markPackAsOwned(pack.id);

    Alert.alert("구매 완료", `${pack.title}을 사용할 수 있어요!`);
  };

  const handlePressTag = (tag: string) => {
    router.push({
      pathname: "/shop",
      params: { search: tag },
    });
  };

  if (!pack && (!hasFinishedInitialPackLoad || isPackLoading)) {
    return (
      <Screen>
        <PackDetailSkeleton />
      </Screen>
    );
  }

  if (!pack) {
    return (
      <Screen>
        <View style={styles.notFoundContainer}>
          <AppText variant="h2">존재하지 않는 팩이에요.</AppText>
          <View style={{ marginTop: spacing.lg }}>
            <AppButton label="상점으로 돌아가기" onPress={handleBack} />
          </View>
        </View>
      </Screen>
    );
  }

  if (!isInitialPreviewReady) {
    return (
      <Screen>
        <PackDetailSkeleton />
      </Screen>
    );
  }

  const primaryLabel =
    pack.ownStatus === "owned"
      ? "사용하기"
      : pack.status === "free"
        ? "다운받기"
        : `${pack.coinPrice?.toLocaleString() ?? 0}코인으로 구매하기`;
  const previewTitle =
    pack.kind === "sticker" ? "포함된 스티커" : "포함된 배경";
  const hasMorePreviewItems = renderedPreviewItems.length < previewItems.length;
  const hiddenPreviewItemCount =
    previewItems.length - renderedPreviewItems.length;

  const handleShowMorePreviewItems = async () => {
    const nextLimit = Math.min(
      previewItems.length,
      previewRenderLimit + LOAD_MORE_PREVIEW_COUNT,
    );

    await Promise.race([
      prefetchImageSources(
        previewItems
          .slice(previewRenderLimit, nextLimit)
          .map((item) => item.imageSource),
        "memory-disk",
      ) ?? Promise.resolve(false),
      wait(700),
    ]);

    setPreviewRenderLimit(nextLimit);
  };

  const renderPreviewItem = ({
    item,
  }: {
    item: PackPreviewSticker | PackPreviewBackground;
  }) => (
    <StickerPreviewCard
      id={item.id}
      name={item.name}
      imageSource={item.imageSource}
      style={styles.previewCard}
    />
  );

  return (
    <Screen>
      <FlashList
        data={renderedPreviewItems}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={renderPreviewItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={
          <>
            <View style={styles.topBar}>
              <IconButton
                imageSource={require("../../../assets/icons/back.png")}
                onPress={handleBack}
                variant="ghost"
                size={40}
                iconSize={20}
              />
            </View>

            <View style={styles.heroCard}>
              <View style={styles.heroImageWrapper}>
                {pack.thumbnailSource ? (
                  <ExpoImage
                    source={pack.thumbnailSource}
                    style={styles.heroImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    priority="high"
                    transition={100}
                  />
                ) : (
                  <View style={styles.heroPlaceholder} />
                )}
              </View>

              <View style={styles.heroTextArea}>
                <View style={styles.titleRow}>
                  <AppText variant="h2" style={styles.packTitle}>
                    {pack.title}
                  </AppText>

                  {pack.isNew ? (
                    <View style={styles.newBadge}>
                      <AppText variant="small" style={styles.newBadgeText}>
                        신규
                      </AppText>
                    </View>
                  ) : null}
                </View>

                {!!pack.description && (
                  <AppText variant="caption" style={styles.description}>
                    {pack.description}
                  </AppText>
                )}

                <View style={styles.statusRow}>
                  {pack.ownStatus === "owned" ? (
                    <View style={[styles.statusBadge, styles.ownedBadge]}>
                      <AppText variant="small" style={styles.ownedBadgeText}>
                        보유중
                      </AppText>
                    </View>
                  ) : null}

                  {pack.status === "free" ? (
                    <View style={[styles.statusBadge, styles.freeBadge]}>
                      <AppText variant="small" style={styles.freeBadgeText}>
                        무료
                      </AppText>
                    </View>
                  ) : null}

                  {pack.status === "priced" ? (
                    <View style={[styles.statusBadge, styles.priceBadge]}>
                      <Image
                        source={require("../../../assets/icons/coin.png")}
                        style={{ width: 20, height: 20 }}
                      />
                      <AppText variant="small" style={styles.priceBadgeText}>
                        {pack.coinPrice?.toLocaleString() ?? 0}코인
                      </AppText>
                    </View>
                  ) : null}
                </View>

                {pack.tags?.length ? (
                  <View style={styles.tagSection}>
                    {pack.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={`#${tag}`}
                        onPress={() => handlePressTag(tag)}
                        style={styles.tagChip}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.actionSection}>
              <AppButton
                label={primaryLabel}
                onPress={handlePrimaryAction}
                leftIcon={
                  pack.status === "priced" && pack.ownStatus !== "owned" ? (
                    <Image
                      source={require("../../../assets/icons/coin.png")}
                      style={styles.primaryButtonCoin}
                    />
                  ) : undefined
                }
              />
            </View>

            <View style={styles.lengthRow}>
              <AppText variant="title">{previewTitle}</AppText>
              <AppText>{previewItems.length}개</AppText>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyPreview}>
            <AppText variant="caption">
              미리보기 아이템이 아직 준비되지 않았어요.
            </AppText>
          </View>
        }
        ListFooterComponent={
          isShowingMorePreviewItems ? (
            <View style={styles.morePreviewSkeletonGrid}>
              {Array.from({ length: Math.min(6, hiddenPreviewItemCount) }).map(
                (_, index) => (
                  <View key={index} style={styles.morePreviewSkeletonCell}>
                    <SkeletonBox height={88} borderRadius={16} />
                    <SkeletonBox
                      height={14}
                      width="68%"
                      borderRadius={7}
                      style={styles.morePreviewSkeletonLabel}
                    />
                  </View>
                ),
              )}
            </View>
          ) : hasMorePreviewItems ? (
            <View style={styles.morePreviewSection}>
              <AppButton
                label={`더보기 (${hiddenPreviewItemCount}개)`}
                onPress={handleShowMorePreviewItems}
                variant="secondary"
              />
            </View>
          ) : null
        }
      />
    </Screen>
  );
};

export default PackDetailScreen;

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    paddingTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  heroCard: {
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
    borderRadius: radius.xxl,
    padding: spacing.md,
  },
  heroImageWrapper: {
    width: "100%",
    aspectRatio: 1.1,
    borderRadius: radius.xl,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  heroImage: {
    width: "84%",
    height: "84%",
  },
  heroPlaceholder: {
    width: "84%",
    height: "84%",
    borderRadius: radius.lg,
    backgroundColor: colors.background.surface,
  },
  heroTextArea: {
    marginTop: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  packTitle: {
    flexShrink: 1,
  },
  newBadge: {
    backgroundColor: colors.state.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.round,
  },
  newBadgeText: {
    color: colors.text.inverse,
    fontSize: 10,
    lineHeight: 12,
  },
  description: {
    marginTop: spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    marginTop: spacing.sm,
    gap: 10,
  },
  statusBadge: {
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  tagSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tagChip: {
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  primaryButtonCoin: {
    width: 18,
    height: 18,
    resizeMode: "contain",
  },
  ownedBadge: {
    backgroundColor: "#E7F1E1",
  },
  ownedBadgeText: {
    color: colors.state.success,
  },
  freeBadge: {
    backgroundColor: "#F6E8C8",
  },
  freeBadgeText: {
    color: colors.state.warning,
  },
  priceBadge: {
    flexDirection: "row",
    gap: 5,
    backgroundColor: colors.background.subtle,
  },
  priceBadgeText: {
    color: colors.text.secondary,
  },
  actionSection: {
    marginTop: spacing.lg,
  },
  previewCard: {
    width: "100%",
    paddingHorizontal: spacing.xxs,
  },
  emptyPreview: {
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: "center",
  },
  morePreviewSection: {
    marginTop: spacing.sm,
  },
  morePreviewSkeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.sm,
  },
  morePreviewSkeletonCell: {
    width: "33.333%",
    paddingHorizontal: spacing.xxs,
    marginBottom: spacing.md,
  },
  morePreviewSkeletonLabel: {
    alignSelf: "center",
    marginTop: spacing.xs,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  lengthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
});
