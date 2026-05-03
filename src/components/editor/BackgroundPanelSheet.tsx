import { ScrollView, StyleSheet, View } from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { BackgroundItem } from "../../types/backgroundPanel";
import SimpleBottomSheet from "../common/SimpleBottomSheet";
import BottomSheetHeader from "../common/BottomSheetHeader";
import IconButton from "../common/IconButton";
import Chip from "../common/Chip";
import BackgroundThumb from "./BackgroundThumb";
import { spacing } from "../../constants/spacing";
import { usePurchaseStore } from "../../store/purchaseStore";
import { resolvePacks } from "../../utils/shop";
import { BackgroundPack } from "../../types/shop";
import StickerPackCard from "./StickerPackCard";
import { AppText } from "../common/AppText";
import { useShopPackStore } from "../../store/shopPackStore";

type CategoryFilter = "all" | BackgroundPack["category"];

const categories: { label: string; value: CategoryFilter }[] = [
  { label: "전체", value: "all" },
  { label: "모눈", value: "grid" },
  { label: "체크", value: "check" },
  { label: "도트/패턴", value: "dot" },
  { label: "종이/노트", value: "paper" },
  { label: "컬러/그라데이션", value: "color" },
  { label: "공간", value: "room" },
  { label: "풍경", value: "landscape" },
  { label: "데코", value: "deco" },
];

interface BackgroundPanelSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedBackgroundId?: string | null;
  onSelectBackground: (item: BackgroundItem) => void;
}

const BackgroundPanelSheet = ({
  visible,
  onClose,
  selectedBackgroundId,
  onSelectBackground,
}: BackgroundPanelSheetProps) => {
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");
  const [selectedPack, setSelectedPack] = useState<BackgroundPack | null>(null);
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

  const ownedBackgroundPacks = useMemo(
    () =>
      resolvePacks(packs, ownedPackIds).filter(
        (pack): pack is BackgroundPack =>
          pack.kind === "background" && pack.ownStatus === "owned",
      ),
    [ownedPackIds, packs],
  );

  const filteredPacks = useMemo(() => {
    if (selectedCategory === "all") return ownedBackgroundPacks;

    return ownedBackgroundPacks.filter(
      (pack) => pack.category === selectedCategory,
    );
  }, [ownedBackgroundPacks, selectedCategory]);

  const selectedPackBackgrounds = useMemo(
    () =>
      (selectedPack?.previewBackgrounds ?? []).map(
        (background): BackgroundItem => ({
          ...background,
          category: selectedPack?.category ?? "grid",
        }),
      ),
    [selectedPack],
  );

  const handleClose = () => {
    setSelectedPack(null);
    onClose();
  };

  const handleBackToPackList = () => {
    setSelectedPack(null);
  };

  return (
    <SimpleBottomSheet visible={visible} onClose={handleClose}>
      <View style={styles.container}>
        <BottomSheetHeader
          title="배경 선택"
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
                배경을 탭하면 캔버스에 적용돼요.
              </AppText>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.grid}>
                {selectedPackBackgrounds.map((item) => (
                  <BackgroundThumb
                    key={item.id}
                    name={item.name}
                    imageSource={item.imageSource}
                    backgroundColor={item.backgroundColor}
                    selected={selectedBackgroundId === item.id}
                    onPress={() => onSelectBackground(item)}
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

export default BackgroundPanelSheet;

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
