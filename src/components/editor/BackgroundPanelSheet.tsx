import { ScrollView, StyleSheet, Text, View } from "react-native";
import React, { useMemo, useState } from "react";
import { BackgroundItem } from "../../types/backgroundPanel";
import { mockBackgrounds } from "../../mocks/backgroundPanel";
import SimpleBottomSheet from "../common/SimpleBottomSheet";
import BottomSheetHeader from "../common/BottomSheetHeader";
import Chip from "../common/Chip";
import BackgroundThumb from "./BackgroundThumb";
import { spacing } from "../../constants/spacing";

type CategoryFilter = "all" | "grid" | "check" | "deco" | "landscape";

const categories: { label: string; value: CategoryFilter }[] = [
  { label: "전체", value: "all" },
  { label: "모눈", value: "grid" },
  { label: "체크", value: "check" },
  { label: "데코", value: "deco" },
  { label: "풍경", value: "landscape" },
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

  const filteredBackgrounds = useMemo(() => {
    if (selectedCategory === "all") return mockBackgrounds;
    return mockBackgrounds.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <SimpleBottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <BottomSheetHeader title="배경 선택" />

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
            {filteredBackgrounds.map((item) => (
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
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
