import { StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import React, { useEffect, useMemo, useState } from "react";
import SimpleBottomSheet from "../common/SimpleBottomSheet";
import BottomSheetHeader from "../common/BottomSheetHeader";
import IconButton from "../common/IconButton";
import Chip from "../common/Chip";
import StickerPackCard from "./StickerPackCard";
import { AppText } from "../common/AppText";
import StickerThumb from "./StickerThumb";
import { spacing } from "../../constants/spacing";
import { resolvePacks } from "../../utils/shop";
import { StickerPack } from "../../types/shop";
import { usePurchaseStore } from "../../store/purchaseStore";
import { useShopPackStore } from "../../store/shopPackStore";
import { prefetchImageSources } from "../../utils/prefetchImageSources";
import {
  packCategoryLabelMap,
  stickerCategoryOptions,
} from "../../constants/packCategories";

type CategoryFilter = "all" | StickerPack["category"];

const categories: { label: string; value: CategoryFilter }[] = [
  { label: "전체", value: "all" },
  ...stickerCategoryOptions.map((category) => ({
    label: packCategoryLabelMap[category] ?? category,
    value: category as CategoryFilter,
  })),
];

interface StickerPanelSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectSticker: (payload: { stickerId: string; imageSource?: any }) => void;
}

const StickerPanelSheet = ({
  visible,
  onClose,
  onSelectSticker,
}: StickerPanelSheetProps) => {
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");
  const [selectedPack, setSelectedPack] = useState<StickerPack | null>(null);
  const [recentlyAddedStickerId, setRecentlyAddedStickerId] = useState<
    string | null
  >(null);
  const ownedPackIds = usePurchaseStore((state) => state.ownedPackIds);
  const isLoaded = usePurchaseStore((state) => state.isLoaded);
  const loadOwnedPackIds = usePurchaseStore((state) => state.loadOwnedPackIds);
  const packs = useShopPackStore((state) => state.packs);
  const loadPacks = useShopPackStore((state) => state.loadPacks);

  useEffect(() => {
    if (!visible) return;

    if (!isLoaded) {
      void loadOwnedPackIds();
    }
    void loadPacks();
  }, [isLoaded, loadOwnedPackIds, loadPacks, visible]);

  const ownedStickerPacks = useMemo(
    () =>
      resolvePacks(packs, ownedPackIds).filter(
        (pack): pack is StickerPack =>
          pack.kind === "sticker" && pack.ownStatus === "owned",
      ),
    [ownedPackIds, packs],
  );

  const filteredPacks = useMemo(() => {
    if (selectedCategory === "all") return ownedStickerPacks;
    return ownedStickerPacks.filter(
      (pack) => pack.category === selectedCategory,
    );
  }, [ownedStickerPacks, selectedCategory]);

  useEffect(() => {
    prefetchImageSources(filteredPacks.map((pack) => pack.thumbnailSource));
  }, [filteredPacks]);

  useEffect(() => {
    if (!selectedPack) return;
    prefetchImageSources(
      selectedPack.previewStickers.map(
        (sticker) => sticker.originalImageSource ?? sticker.imageSource,
      ),
    );
  }, [selectedPack]);

  const handleClose = () => {
    setSelectedPack(null);
    onClose();
  };

  const handleBackToPackList = () => {
    setSelectedPack(null);
  };

  useEffect(() => {
    if (!recentlyAddedStickerId) return;

    const timeoutId = setTimeout(() => {
      setRecentlyAddedStickerId(null);
    }, 220);

    return () => clearTimeout(timeoutId);
  }, [recentlyAddedStickerId]);

  return (
    <SimpleBottomSheet visible={visible} onClose={handleClose}>
      <View style={styles.container}>
        <BottomSheetHeader
          title="스티커 선택"
          leftSlot={
            selectedPack ? (
              <IconButton
                imageSource={require("../../../assets/icons/back.png")}
                onPress={handleBackToPackList}
                variant="ghost"
                size={32}
                iconSize={16}
                rounded={false}
              />
            ) : undefined
          }
        />

        {!selectedPack ? (
          <>
            <View style={styles.categoryRow}>
              {categories.map((category) => (
                <Chip
                  key={category.value}
                  label={category.label}
                  selected={selectedCategory === category.value}
                  onPress={() => setSelectedCategory(category.value)}
                />
              ))}
            </View>

            <FlashList
              data={filteredPacks}
              keyExtractor={(pack) => pack.id}
              numColumns={2}
              renderItem={({ item: pack, index }) => (
                <View
                  style={[
                    styles.gridItem,
                    index % 2 === 0
                      ? styles.leftGridItem
                      : styles.rightGridItem,
                  ]}
                >
                  <StickerPackCard
                    title={pack.title}
                    thumbnailSource={pack.thumbnailSource}
                    onPress={() => setSelectedPack(pack)}
                  />
                </View>
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            />
          </>
        ) : (
          <>
            <View style={styles.selectedPackHeader}>
              <AppText variant="title">{selectedPack.title}</AppText>
              <AppText variant="caption">
                스티커를 탭하면 캔버스에 추가돼요.
              </AppText>
            </View>

            <FlashList
              data={selectedPack.previewStickers}
              keyExtractor={(sticker) => sticker.id}
              numColumns={2}
              renderItem={({ item: sticker, index }) => (
                <View
                  style={[
                    styles.gridItem,
                    index % 2 === 0
                      ? styles.leftGridItem
                      : styles.rightGridItem,
                  ]}
                >
                  <StickerThumb
                    name={sticker.name}
                    imageSource={sticker.imageSource}
                    added={recentlyAddedStickerId === sticker.id}
                    onPress={() => {
                      setRecentlyAddedStickerId(sticker.id);
                      onSelectSticker({
                        stickerId: sticker.id,
                        imageSource:
                          sticker.originalImageSource ?? sticker.imageSource,
                      });
                    }}
                  />
                </View>
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              extraData={recentlyAddedStickerId}
            />
          </>
        )}
      </View>
    </SimpleBottomSheet>
  );
};

export default StickerPanelSheet;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  selectedPackHeader: {
    marginBottom: spacing.md,
    gap: 4,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  gridItem: {
    width: "100%",
  },
  leftGridItem: {
    paddingRight: spacing.xs,
  },
  rightGridItem: {
    paddingLeft: spacing.xs,
  },
  grid: {
    justifyContent: "space-between",
  },
});
