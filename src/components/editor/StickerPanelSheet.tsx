import { ScrollView, StyleSheet, View } from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { mockPacks } from "../../mocks/shop";
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

type CategoryFilter = "all" | StickerPack["category"];

const categories: { label: string; value: CategoryFilter }[] = [
  { label: "전체", value: "all" },
  { label: "음식", value: "food" },
  { label: "데코", value: "deco" },
  { label: "메모", value: "memo" },
  { label: "기타", value: "etc" },
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
  const [selectedPack, setSelectedPack] = useState<StickerPack | null>(
    null,
  );
  const [recentlyAddedStickerId, setRecentlyAddedStickerId] = useState<
    string | null
  >(null);
  const ownedPackIds = usePurchaseStore((state) => state.ownedPackIds);
  const isLoaded = usePurchaseStore((state) => state.isLoaded);
  const loadOwnedPackIds = usePurchaseStore((state) => state.loadOwnedPackIds);

  useEffect(() => {
    if (!visible || isLoaded) return;

    void loadOwnedPackIds();
  }, [isLoaded, loadOwnedPackIds, visible]);

  const ownedStickerPacks = useMemo(
    () =>
      resolvePacks(mockPacks, ownedPackIds).filter(
        (pack): pack is StickerPack =>
          pack.kind === "sticker" && pack.ownStatus === "owned",
      ),
    [ownedPackIds],
  );

  const filteredPacks = useMemo(() => {
    if (selectedCategory === "all") return ownedStickerPacks;
    return ownedStickerPacks.filter(
      (pack) => pack.category === selectedCategory,
    );
  }, [ownedStickerPacks, selectedCategory]);

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

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.grid}>
                {filteredPacks.map((pack) => (
                  <StickerPackCard
                    key={pack.id}
                    title={pack.title}
                    thumbnailSource={pack.thumbnailSource}
                    onPress={() => setSelectedPack(pack)}
                  />
                ))}
              </View>
            </ScrollView>
          </>
        ) : (
          <>
            <View style={styles.selectedPackHeader}>
              <AppText variant="title">{selectedPack.title}</AppText>
              <AppText variant="caption">
                스티커를 탭하면 캔버스에 추가돼요.
              </AppText>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.grid}>
                {selectedPack.previewStickers.map((sticker) => (
                  <StickerThumb
                    key={sticker.id}
                    name={sticker.name}
                    imageSource={sticker.imageSource}
                    added={recentlyAddedStickerId === sticker.id}
                    onPress={() => {
                      setRecentlyAddedStickerId(sticker.id);
                      onSelectSticker({
                        stickerId: sticker.id,
                        imageSource: sticker.imageSource,
                      });
                    }}
                  />
                ))}
              </View>
            </ScrollView>
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
